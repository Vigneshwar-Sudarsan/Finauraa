import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { respondToInvitationSchema } from "@/lib/validations/family";
import { validateRequestBody, formatZodError } from "@/lib/validations/consent";
import { sendMemberJoinedNotification } from "@/lib/email";

/**
 * GET /api/family/invitations/[token]
 * Fetches invitation details by token (public)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const supabase = await createClient();

    // Fetch invitation by token (includes cached inviter/group names for public display)
    const { data: invitation, error } = await supabase
      .from("family_members")
      .select(`
        id,
        group_id,
        email,
        role,
        invited_by,
        invited_at,
        status,
        invitation_expires_at,
        inviter_name,
        group_name
      `)
      .eq("invitation_token", token)
      .single();

    if (error || !invitation) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      );
    }

    // Check if invitation has expired
    if (new Date(invitation.invitation_expires_at) < new Date()) {
      return NextResponse.json(
        { error: "This invitation has expired", expired: true },
        { status: 410 }
      );
    }

    // Check if already responded
    if (invitation.status !== "pending") {
      return NextResponse.json(
        { error: "This invitation has already been responded to", status: invitation.status },
        { status: 410 }
      );
    }

    // Fetch group details
    const { data: group } = await supabase
      .from("family_groups")
      .select("id, name, owner_id")
      .eq("id", invitation.group_id)
      .single();

    // Fetch inviter profile
    const { data: inviter } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("id", invitation.invited_by)
      .single();

    // Get member count
    const { count } = await supabase
      .from("family_members")
      .select("id", { count: "exact", head: true })
      .eq("group_id", invitation.group_id)
      .eq("status", "active");

    // Use cached names as fallback when RLS blocks access to related tables (for unauthenticated users)
    return NextResponse.json({
      invitation: {
        ...invitation,
        group: group
          ? { ...group, member_count: count || 0 }
          : invitation.group_name
            ? { id: invitation.group_id, name: invitation.group_name, member_count: 0 }
            : null,
        inviter: inviter || (invitation.inviter_name
          ? { id: invitation.invited_by, full_name: invitation.inviter_name, email: null }
          : null),
      },
    });
  } catch (error) {
    console.error("Invitation fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch invitation" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/family/invitations/[token]
 * Accept or decline an invitation
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validate request body
    const body = await request.json();
    const validation = validateRequestBody(respondToInvitationSchema, body);
    if (!validation.success) {
      return NextResponse.json(formatZodError(validation.error), { status: 400 });
    }

    const { action } = validation.data;

    // Fetch invitation by token
    const { data: invitation, error: fetchError } = await supabase
      .from("family_members")
      .select("id, group_id, email, role, status, invitation_expires_at")
      .eq("invitation_token", token)
      .single();

    if (fetchError || !invitation) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      );
    }

    // Check if invitation has expired
    if (new Date(invitation.invitation_expires_at) < new Date()) {
      return NextResponse.json(
        { error: "This invitation has expired" },
        { status: 410 }
      );
    }

    // Check if already responded
    if (invitation.status !== "pending") {
      return NextResponse.json(
        { error: "This invitation has already been responded to" },
        { status: 410 }
      );
    }

    // Verify the invitation email matches user's email
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, family_group_id")
      .eq("id", user.id)
      .single();

    if (!profile?.email || profile.email.toLowerCase() !== invitation.email.toLowerCase()) {
      return NextResponse.json(
        { error: "This invitation was sent to a different email address" },
        { status: 403 }
      );
    }

    // Check if user is already in a family group
    if (profile.family_group_id) {
      return NextResponse.json(
        { error: "You are already a member of a family group. Leave your current group first." },
        { status: 400 }
      );
    }

    // Check if user already has an active membership
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

    if (action === "decline") {
      // Update invitation status to removed
      await supabase
        .from("family_members")
        .update({
          status: "removed",
          invitation_token: null,
        })
        .eq("id", invitation.id);

      return NextResponse.json({
        message: "Invitation declined",
      });
    }

    // Accept invitation
    const { error: updateError } = await supabase
      .from("family_members")
      .update({
        user_id: user.id,
        status: "active",
        joined_at: new Date().toISOString(),
        invitation_token: null,
      })
      .eq("id", invitation.id);

    if (updateError) {
      console.error("Failed to accept invitation:", updateError);
      return NextResponse.json(
        { error: "Failed to accept invitation" },
        { status: 500 }
      );
    }

    // Update user's profile with family_group_id
    await supabase
      .from("profiles")
      .update({ family_group_id: invitation.group_id })
      .eq("id", user.id);

    // Fetch group details and owner info for notification
    const { data: group } = await supabase
      .from("family_groups")
      .select("name, owner_id")
      .eq("id", invitation.group_id)
      .single();

    // Fetch owner's profile to send notification
    if (group?.owner_id) {
      const { data: ownerProfile } = await supabase
        .from("profiles")
        .select("email, full_name")
        .eq("id", group.owner_id)
        .single();

      const { data: memberProfile } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", user.id)
        .single();

      // Send notification to owner that a member joined
      if (ownerProfile?.email) {
        await sendMemberJoinedNotification(
          ownerProfile.email,
          ownerProfile.full_name || "there",
          memberProfile?.full_name || memberProfile?.email || invitation.email,
          group.name || "your family group"
        );
      }
    }

    return NextResponse.json({
      message: `Successfully joined ${group?.name || "the family group"}`,
      groupId: invitation.group_id,
    });
  } catch (error) {
    console.error("Invitation response error:", error);
    return NextResponse.json(
      { error: "Failed to respond to invitation" },
      { status: 500 }
    );
  }
}
