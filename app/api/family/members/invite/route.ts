import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/ratelimit";
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

    // Only the primary user (owner) can invite new members
    const { data: ownedGroup } = await supabase
      .from("family_groups")
      .select("id, name")
      .eq("owner_id", user.id)
      .single();

    if (!ownedGroup) {
      return NextResponse.json(
        { error: "Only the primary account holder can invite family members" },
        { status: 403 }
      );
    }

    const groupId = ownedGroup.id;
    const groupName = ownedGroup.name;

    // Validate request body
    const body = await request.json();

    // Validate email format
    const email = body.email?.toLowerCase().trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Please enter a valid email address" }, { status: 400 });
    }

    // All invited members get the "member" role - only the primary user (owner) can manage
    const role = "member";

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

    // Get inviter name for storing with invitation
    const { data: inviterData } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", user.id)
      .single();

    const inviterName = inviterData?.full_name || inviterData?.email || "A family member";

    // Create pending member entry with cached inviter/group names for public display
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
        inviter_name: inviterName,
        group_name: groupName,
      })
      .select()
      .single();

    if (memberError) {
      console.error("Failed to create invitation:", memberError);
      return NextResponse.json(
        { error: `Failed to create invitation: ${memberError.message}` },
        { status: 500 }
      );
    }

    // Check if invited user already has an account - create in-app notification
    const { data: invitedUserProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email)
      .single();

    if (invitedUserProfile) {
      // Create in-app notification for existing user
      await supabase.from("notifications").insert({
        user_id: invitedUserProfile.id,
        type: "family_invitation",
        title: "Family Group Invitation",
        message: `${inviterName} has invited you to join ${groupName || "their family group"}`,
        data: {
          invitation_token: invitationToken,
          group_id: groupId,
          group_name: groupName,
          inviter_name: inviterName,
          expires_at: expiresAt.toISOString(),
        },
      });
    }

    // Send invitation email
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.finauraa.com";
    const acceptUrl = `${appUrl}/family/invite/${invitationToken}`;

    console.log("Sending family invitation email to:", email);
    console.log("Accept URL:", acceptUrl);

    const emailResult = await sendFamilyInvitationEmail(
      email,
      inviterName,
      groupName || "Family Group",
      acceptUrl
    );

    console.log("Email send result:", emailResult);

    if (!emailResult.success) {
      console.error("Failed to send invitation email:", emailResult.error);
      // Still return success as the invitation was created, but note the email issue
    }

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
      { error: error instanceof Error ? error.message : "Failed to send invitation" },
      { status: 500 }
    );
  }
}
