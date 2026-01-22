import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/family/invitations
 * Fetches pending invitations for the current user
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

    // Get user's email from profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", user.id)
      .single();

    if (!profile?.email) {
      return NextResponse.json({ invitations: [] });
    }

    // Fetch pending invitations for user's email
    const { data: invitations, error } = await supabase
      .from("family_members")
      .select(`
        id,
        group_id,
        email,
        role,
        invited_by,
        invited_at,
        status,
        invitation_expires_at
      `)
      .eq("email", profile.email.toLowerCase())
      .eq("status", "pending")
      .gt("invitation_expires_at", new Date().toISOString());

    if (error) {
      console.error("Failed to fetch invitations:", error);
      return NextResponse.json(
        { error: "Failed to fetch invitations" },
        { status: 500 }
      );
    }

    // Fetch group details and inviter profiles
    const groupIds = [...new Set((invitations || []).map((i) => i.group_id))];
    const inviterIds = [...new Set((invitations || []).map((i) => i.invited_by))];

    const { data: groups } = groupIds.length > 0
      ? await supabase
          .from("family_groups")
          .select("id, name, owner_id")
          .in("id", groupIds)
      : { data: [] };

    const { data: inviters } = inviterIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", inviterIds)
      : { data: [] };

    const groupsMap = new Map((groups || []).map((g) => [g.id, g]));
    const invitersMap = new Map((inviters || []).map((i) => [i.id, i]));

    // Combine data
    const invitationsWithDetails = (invitations || []).map((invitation) => ({
      ...invitation,
      group: groupsMap.get(invitation.group_id),
      inviter: invitersMap.get(invitation.invited_by),
    }));

    return NextResponse.json({ invitations: invitationsWithDetails });
  } catch (error) {
    console.error("Invitations fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch invitations" },
      { status: 500 }
    );
  }
}
