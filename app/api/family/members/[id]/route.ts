import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { updateMemberRoleSchema } from "@/lib/validations/family";
import { validateRequestBody, formatZodError } from "@/lib/validations/consent";

/**
 * GET /api/family/members/[id]
 * Fetches a specific member's details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch the member
    const { data: member, error } = await supabase
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
        status
      `)
      .eq("id", id)
      .single();

    if (error || !member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Verify user has access to this group
    const { data: ownedGroup } = await supabase
      .from("family_groups")
      .select("id")
      .eq("id", member.group_id)
      .eq("owner_id", user.id)
      .single();

    const { data: membership } = await supabase
      .from("family_members")
      .select("group_id")
      .eq("user_id", user.id)
      .eq("group_id", member.group_id)
      .eq("status", "active")
      .single();

    if (!ownedGroup && !membership) {
      return NextResponse.json(
        { error: "You do not have access to this member" },
        { status: 403 }
      );
    }

    // Fetch profile if user_id exists
    let profile = null;
    if (member.user_id) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name, email, avatar_url")
        .eq("id", member.user_id)
        .single();
      profile = profileData;
    }

    return NextResponse.json({
      member: { ...member, profile },
    });
  } catch (error) {
    console.error("Member fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch member" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/family/members/[id]
 * Updates a member's role (owner only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch the member to update
    const { data: member, error: fetchError } = await supabase
      .from("family_members")
      .select("id, group_id, role, user_id")
      .eq("id", id)
      .single();

    if (fetchError || !member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Check if user is the owner of this group
    const { data: group } = await supabase
      .from("family_groups")
      .select("id, owner_id")
      .eq("id", member.group_id)
      .single();

    if (!group || group.owner_id !== user.id) {
      return NextResponse.json(
        { error: "Only the group owner can change member roles" },
        { status: 403 }
      );
    }

    // Cannot change owner's role
    if (member.role === "owner") {
      return NextResponse.json(
        { error: "Cannot change the owner's role. Use transfer ownership instead." },
        { status: 400 }
      );
    }

    // Validate request body
    const body = await request.json();
    const validation = validateRequestBody(updateMemberRoleSchema, body);
    if (!validation.success) {
      return NextResponse.json(formatZodError(validation.error), { status: 400 });
    }

    const { role } = validation.data;

    // Update member role
    const { data: updatedMember, error: updateError } = await supabase
      .from("family_members")
      .update({ role })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Failed to update member role:", updateError);
      return NextResponse.json(
        { error: "Failed to update member role" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      member: updatedMember,
      message: "Member role updated successfully",
    });
  } catch (error) {
    console.error("Member update error:", error);
    return NextResponse.json(
      { error: "Failed to update member" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/family/members/[id]
 * Removes a member or leaves the group
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch the member to remove
    const { data: member, error: fetchError } = await supabase
      .from("family_members")
      .select("id, group_id, role, user_id, email")
      .eq("id", id)
      .single();

    if (fetchError || !member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Check if user is the group owner
    const { data: group } = await supabase
      .from("family_groups")
      .select("id, owner_id")
      .eq("id", member.group_id)
      .single();

    const isOwner = group?.owner_id === user.id;
    const isSelf = member.user_id === user.id;

    // Owner cannot leave (must transfer ownership or delete group)
    if (isSelf && member.role === "owner") {
      return NextResponse.json(
        { error: "Owner cannot leave. Transfer ownership or delete the group." },
        { status: 400 }
      );
    }

    // Only owner can remove others, or user can remove themselves (leave)
    if (!isOwner && !isSelf) {
      return NextResponse.json(
        { error: "Only the group owner can remove members" },
        { status: 403 }
      );
    }

    // Update member status to removed
    const { error: updateError } = await supabase
      .from("family_members")
      .update({ status: "removed" })
      .eq("id", id);

    if (updateError) {
      console.error("Failed to remove member:", updateError);
      return NextResponse.json(
        { error: "Failed to remove member" },
        { status: 500 }
      );
    }

    // Clear family_group_id from profile if user_id exists
    if (member.user_id) {
      await supabase
        .from("profiles")
        .update({ family_group_id: null })
        .eq("id", member.user_id);
    }

    const action = isSelf ? "left" : "removed";
    return NextResponse.json({
      message: `Successfully ${action} the family group`,
    });
  } catch (error) {
    console.error("Member removal error:", error);
    return NextResponse.json(
      { error: "Failed to remove member" },
      { status: 500 }
    );
  }
}
