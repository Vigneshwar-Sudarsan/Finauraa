import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/ratelimit";
import {
  createFamilyGroupSchema,
  updateFamilyGroupSchema,
} from "@/lib/validations/family";
import { validateRequestBody, formatZodError } from "@/lib/validations/consent";

const MAX_FAMILY_MEMBERS = 7;

/**
 * GET /api/family/group
 * Fetches the user's family group with members
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user profile to check subscription tier
    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_tier, family_group_id")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Check if user has family tier
    if (profile.subscription_tier !== "family") {
      return NextResponse.json(
        { error: "Family tier subscription required", requiresUpgrade: true },
        { status: 403 }
      );
    }

    // Check if user is group owner
    const { data: ownedGroup } = await supabase
      .from("family_groups")
      .select("*")
      .eq("owner_id", user.id)
      .single();

    // Check if user is a member of a group
    const { data: membership } = await supabase
      .from("family_members")
      .select("group_id, role, status")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    let group = ownedGroup;
    let userRole = ownedGroup ? "owner" : membership?.role;

    // If not owner, fetch the group they're a member of
    if (!ownedGroup && membership) {
      const { data: memberGroup } = await supabase
        .from("family_groups")
        .select("*")
        .eq("id", membership.group_id)
        .single();
      group = memberGroup;
    }

    // No group found
    if (!group) {
      return NextResponse.json({ group: null, canCreate: true });
    }

    // Fetch all members with profiles
    const { data: members } = await supabase
      .from("family_members")
      .select(`
        id,
        group_id,
        user_id,
        email,
        role,
        invited_by,
        invited_at,
        joined_at,
        status,
        invitation_token,
        invitation_expires_at
      `)
      .eq("group_id", group.id)
      .neq("status", "removed")
      .order("role", { ascending: true })
      .order("joined_at", { ascending: true });

    // Fetch profiles for members with user_id
    const memberUserIds = (members || [])
      .filter((m) => m.user_id)
      .map((m) => m.user_id);

    const { data: profiles } = memberUserIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, full_name, email, avatar_url")
          .in("id", memberUserIds)
      : { data: [] };

    const profilesMap = new Map(
      (profiles || []).map((p) => [p.id, p])
    );

    // Combine members with profiles
    const membersWithProfiles = (members || []).map((member) => ({
      ...member,
      profile: member.user_id ? profilesMap.get(member.user_id) : null,
    }));

    const activeCount = membersWithProfiles.filter(
      (m) => m.status === "active"
    ).length;
    const pendingCount = membersWithProfiles.filter(
      (m) => m.status === "pending"
    ).length;

    return NextResponse.json({
      group: {
        ...group,
        members: membersWithProfiles,
        member_count: activeCount,
        pending_count: pendingCount,
        max_members: MAX_FAMILY_MEMBERS,
      },
      userRole,
      isOwner: userRole === "owner",
    });
  } catch (error) {
    console.error("Family group fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch family group" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/family/group
 * Creates a new family group (owner only)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit
    const rateLimitResponse = await checkRateLimit("api", user.id);
    if (rateLimitResponse) return rateLimitResponse;

    // Check subscription tier
    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_tier, family_group_id")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    if (profile.subscription_tier !== "family") {
      return NextResponse.json(
        { error: "Family tier subscription required", requiresUpgrade: true },
        { status: 403 }
      );
    }

    // Check if user already owns a group
    const { data: existingGroup } = await supabase
      .from("family_groups")
      .select("id")
      .eq("owner_id", user.id)
      .single();

    if (existingGroup) {
      return NextResponse.json(
        { error: "You already own a family group" },
        { status: 400 }
      );
    }

    // Check if user is already a member of another group
    const { data: existingMembership } = await supabase
      .from("family_members")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (existingMembership) {
      return NextResponse.json(
        { error: "You are already a member of a family group" },
        { status: 400 }
      );
    }

    // Validate request body
    const body = await request.json();
    const validation = validateRequestBody(createFamilyGroupSchema, body);
    if (!validation.success) {
      return NextResponse.json(formatZodError(validation.error), { status: 400 });
    }

    const { name } = validation.data;

    // Get user's email
    const { data: userProfile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", user.id)
      .single();

    // Create family group
    const { data: group, error: groupError } = await supabase
      .from("family_groups")
      .insert({
        owner_id: user.id,
        name,
      })
      .select()
      .single();

    if (groupError) {
      console.error("Failed to create family group:", groupError);
      return NextResponse.json(
        { error: "Failed to create family group" },
        { status: 500 }
      );
    }

    // Add owner as first member
    const { error: memberError } = await supabase.from("family_members").insert({
      group_id: group.id,
      user_id: user.id,
      email: userProfile?.email || user.email,
      role: "owner",
      invited_by: user.id,
      invited_at: new Date().toISOString(),
      joined_at: new Date().toISOString(),
      status: "active",
    });

    if (memberError) {
      console.error("Failed to add owner as member:", memberError);
      // Rollback group creation
      await supabase.from("family_groups").delete().eq("id", group.id);
      return NextResponse.json(
        { error: "Failed to create family group" },
        { status: 500 }
      );
    }

    // Update profile with family_group_id
    await supabase
      .from("profiles")
      .update({ family_group_id: group.id })
      .eq("id", user.id);

    return NextResponse.json({
      group,
      message: "Family group created successfully",
    });
  } catch (error) {
    console.error("Family group creation error:", error);
    return NextResponse.json(
      { error: "Failed to create family group" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/family/group
 * Updates family group name (owner only)
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's owned group
    const { data: group } = await supabase
      .from("family_groups")
      .select("id")
      .eq("owner_id", user.id)
      .single();

    if (!group) {
      return NextResponse.json(
        { error: "You do not own a family group" },
        { status: 403 }
      );
    }

    // Validate request body
    const body = await request.json();
    const validation = validateRequestBody(updateFamilyGroupSchema, body);
    if (!validation.success) {
      return NextResponse.json(formatZodError(validation.error), { status: 400 });
    }

    const { name } = validation.data;

    // Update group
    const { data: updatedGroup, error } = await supabase
      .from("family_groups")
      .update({ name, updated_at: new Date().toISOString() })
      .eq("id", group.id)
      .select()
      .single();

    if (error) {
      console.error("Failed to update family group:", error);
      return NextResponse.json(
        { error: "Failed to update family group" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      group: updatedGroup,
      message: "Family group updated successfully",
    });
  } catch (error) {
    console.error("Family group update error:", error);
    return NextResponse.json(
      { error: "Failed to update family group" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/family/group
 * Deletes family group and removes all members (owner only)
 */
export async function DELETE() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's owned group
    const { data: group } = await supabase
      .from("family_groups")
      .select("id")
      .eq("owner_id", user.id)
      .single();

    if (!group) {
      return NextResponse.json(
        { error: "You do not own a family group" },
        { status: 403 }
      );
    }

    // Get all member user_ids to update their profiles
    const { data: members } = await supabase
      .from("family_members")
      .select("user_id")
      .eq("group_id", group.id)
      .not("user_id", "is", null);

    const memberUserIds = (members || []).map((m) => m.user_id).filter(Boolean);

    // Clear family_group_id from all member profiles
    if (memberUserIds.length > 0) {
      await supabase
        .from("profiles")
        .update({ family_group_id: null })
        .in("id", memberUserIds);
    }

    // Delete all members
    await supabase.from("family_members").delete().eq("group_id", group.id);

    // Delete the group
    const { error } = await supabase
      .from("family_groups")
      .delete()
      .eq("id", group.id);

    if (error) {
      console.error("Failed to delete family group:", error);
      return NextResponse.json(
        { error: "Failed to delete family group" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Family group deleted successfully",
    });
  } catch (error) {
    console.error("Family group deletion error:", error);
    return NextResponse.json(
      { error: "Failed to delete family group" },
      { status: 500 }
    );
  }
}
