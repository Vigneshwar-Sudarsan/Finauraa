import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/finance/family/savings-goals/[id]/history
 * Fetch contribution history for a family goal
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

    // Get user's family group
    const { data: profile } = await supabase
      .from("profiles")
      .select("family_group_id")
      .eq("id", user.id)
      .single();

    if (!profile?.family_group_id) {
      return NextResponse.json({ error: "Not in a family group" }, { status: 403 });
    }

    // Verify the goal belongs to the user's family
    const { data: goal, error: goalError } = await supabase
      .from("savings_goals")
      .select("id, name, family_group_id, scope, created_at, created_by, target_amount, currency")
      .eq("id", id)
      .eq("family_group_id", profile.family_group_id)
      .eq("scope", "family")
      .single();

    if (goalError || !goal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    // Fetch contribution history
    const { data: history, error: historyError } = await supabase
      .from("contribution_history")
      .select("id, contributor_id, recorded_by_id, amount, currency, note, created_at")
      .eq("goal_id", id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (historyError) {
      console.error("Failed to fetch contribution history:", historyError);
      return NextResponse.json(
        { error: "Failed to fetch history" },
        { status: 500 }
      );
    }

    // Get unique user IDs for profile lookup (include goal creator)
    const userIds = [...new Set([
      ...history.map(h => h.contributor_id),
      ...history.map(h => h.recorded_by_id),
      goal.created_by,
    ].filter(Boolean))];

    // Fetch user profiles
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", userIds);

    const profileLookup = new Map(
      (profiles || []).map(p => [p.id, p])
    );

    // Enrich history with names
    const enrichedHistory = history.map(entry => {
      const contributorProfile = profileLookup.get(entry.contributor_id);
      const recorderProfile = profileLookup.get(entry.recorded_by_id);

      return {
        id: entry.id,
        amount: entry.amount,
        currency: entry.currency,
        note: entry.note,
        created_at: entry.created_at,
        contributor: {
          id: entry.contributor_id,
          name: contributorProfile?.full_name || contributorProfile?.email?.split("@")[0] || "Member",
        },
        recorded_by: entry.contributor_id !== entry.recorded_by_id ? {
          id: entry.recorded_by_id,
          name: recorderProfile?.full_name || recorderProfile?.email?.split("@")[0] || "Member",
        } : null,
      };
    });

    // Get creator profile for goal creation event
    const creatorProfile = profileLookup.get(goal.created_by);

    return NextResponse.json({
      goal: {
        id: goal.id,
        name: goal.name,
        target_amount: goal.target_amount,
        currency: goal.currency,
        created_at: goal.created_at,
        created_by: {
          id: goal.created_by,
          name: creatorProfile?.full_name || creatorProfile?.email?.split("@")[0] || "Member",
        },
      },
      history: enrichedHistory,
    });
  } catch (error) {
    console.error("Failed to fetch contribution history:", error);
    return NextResponse.json(
      { error: "Failed to fetch history" },
      { status: 500 }
    );
  }
}
