import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/ratelimit";
import { inviteFamilyMemberSchema } from "@/lib/validations/family";
import { validateRequestBody, formatZodError } from "@/lib/validations/consent";
import { sendFamilyInvitationEmail } from "@/lib/email";
import crypto from "crypto";

const MAX_FAMILY_MEMBERS = 7;
const INVITATION_EXPIRY_DAYS = 7;

/**
 * POST /api/family/members/invite
 * Invites a new member to the family group
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

    // Rate limit for invitations
    const rateLimitResponse = await checkRateLimit("familyInvite", user.id);
    if (rateLimitResponse) return rateLimitResponse;

    // Check if user owns a group or is admin
    const { data: ownedGroup } = await supabase
      .from("family_groups")
      .select("id, name")
      .eq("owner_id", user.id)
      .single();

    let groupId = ownedGroup?.id;
    let groupName = ownedGroup?.name;
    let userRole = ownedGroup ? "owner" : null;

    // If not owner, check if admin
    if (!ownedGroup) {
      const { data: membership } = await supabase
        .from("family_members")
        .select("group_id, role")
        .eq("user_id", user.id)
        .eq("status", "active")
        .single();

      if (membership?.role === "admin") {
        groupId = membership.group_id;
        userRole = "admin";

        // Fetch group name
        const { data: group } = await supabase
          .from("family_groups")
          .select("name")
          .eq("id", groupId)
          .single();
        groupName = group?.name;
      }
    }

    if (!groupId) {
      return NextResponse.json(
        { error: "You must be an owner or admin to invite members" },
        { status: 403 }
      );
    }

    // Validate request body
    const body = await request.json();
    const validation = validateRequestBody(inviteFamilyMemberSchema, body);
    if (!validation.success) {
      return NextResponse.json(formatZodError(validation.error), { status: 400 });
    }

    const { email, role } = validation.data;

    // Check member limit
    const { count } = await supabase
      .from("family_members")
      .select("id", { count: "exact", head: true })
      .eq("group_id", groupId)
      .in("status", ["active", "pending"]);

    if ((count || 0) >= MAX_FAMILY_MEMBERS) {
      return NextResponse.json(
        { error: `Family group is at maximum capacity (${MAX_FAMILY_MEMBERS} members)` },
        { status: 400 }
      );
    }

    // Check if email is already invited or a member
    const { data: existingMember } = await supabase
      .from("family_members")
      .select("id, status")
      .eq("group_id", groupId)
      .eq("email", email)
      .in("status", ["active", "pending"])
      .single();

    if (existingMember) {
      const statusMessage = existingMember.status === "active"
        ? "is already a member"
        : "has a pending invitation";
      return NextResponse.json(
        { error: `This email ${statusMessage} of the family group` },
        { status: 400 }
      );
    }

    // Check if user is trying to invite themselves
    const { data: inviterProfile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", user.id)
      .single();

    if (inviterProfile?.email?.toLowerCase() === email.toLowerCase()) {
      return NextResponse.json(
        { error: "You cannot invite yourself" },
        { status: 400 }
      );
    }

    // Generate invitation token
    const invitationToken = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRY_DAYS);

    // Create pending member entry
    const { data: member, error: memberError } = await supabase
      .from("family_members")
      .insert({
        group_id: groupId,
        user_id: null, // Will be set when invitation is accepted
        email,
        role,
        invited_by: user.id,
        invited_at: new Date().toISOString(),
        joined_at: null,
        status: "pending",
        invitation_token: invitationToken,
        invitation_expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (memberError) {
      console.error("Failed to create invitation:", memberError);
      return NextResponse.json(
        { error: "Failed to send invitation" },
        { status: 500 }
      );
    }

    // Get inviter name for email
    const { data: inviterData } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", user.id)
      .single();

    const inviterName = inviterData?.full_name || inviterData?.email || "A family member";

    // Send invitation email
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.finauraa.com";
    const acceptUrl = `${appUrl}/family/invite/${invitationToken}`;

    await sendFamilyInvitationEmail(
      email,
      inviterName,
      groupName || "Family Group",
      acceptUrl
    );

    return NextResponse.json({
      member: {
        id: member.id,
        email: member.email,
        role: member.role,
        status: member.status,
        invited_at: member.invited_at,
        invitation_expires_at: member.invitation_expires_at,
      },
      message: "Invitation sent successfully",
    });
  } catch (error) {
    console.error("Invitation error:", error);
    return NextResponse.json(
      { error: "Failed to send invitation" },
      { status: 500 }
    );
  }
}
