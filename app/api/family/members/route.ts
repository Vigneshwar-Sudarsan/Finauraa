import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/family/members
 * Fetches all members of the user's family group
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

    // Check if user owns a group
    const { data: ownedGroup } = await supabase
      .from("family_groups")
      .select("id")
      .eq("owner_id", user.id)
      .single();

    // Check if user is a member of a group
    const { data: membership } = await supabase
      .from("family_members")
      .select("group_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    const groupId = ownedGroup?.id || membership?.group_id;

    if (!groupId) {
      return NextResponse.json({ members: [], noGroup: true });
    }

    // Fetch all members
    const { data: members, error } = await supabase
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
        invitation_expires_at
      `)
      .eq("group_id", groupId)
      .neq("status", "removed")
      .order("role", { ascending: true })
      .order("joined_at", { ascending: true });

    if (error) {
      console.error("Failed to fetch members:", error);
      return NextResponse.json(
        { error: "Failed to fetch members" },
        { status: 500 }
      );
    }

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

    return NextResponse.json({ members: membersWithProfiles });
  } catch (error) {
    console.error("Members fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch members" },
      { status: 500 }
    );
  }
}
