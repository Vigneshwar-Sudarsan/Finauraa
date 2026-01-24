import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/finance/savings-goals/[id]/history
 * Fetch contribution history for a personal savings goal
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify the goal exists and belongs to the user
    const { data: goal, error: goalError } = await supabase
      .from("savings_goals")
      .select("id, name, user_id, created_at, target_amount, currency")
      .eq("id", id)
      .eq("user_id", user.id)
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

    // Get user's profile for name display
    const { data: userProfile } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("id", user.id)
      .single();

    const userName = userProfile?.full_name || userProfile?.email?.split("@")[0] || "You";

    // Enrich history with user name (for personal goals, contributor is always the user)
    const enrichedHistory = history.map(entry => ({
      id: entry.id,
      amount: entry.amount,
      currency: entry.currency,
      note: entry.note,
      created_at: entry.created_at,
      contributor: {
        id: entry.contributor_id,
        name: userName,
      },
      recorded_by: null, // For personal goals, user always records their own contributions
    }));

    return NextResponse.json({
      goal: {
        id: goal.id,
        name: goal.name,
        target_amount: goal.target_amount,
        currency: goal.currency || "BHD",
        created_at: goal.created_at,
        created_by: {
          id: user.id,
          name: userName,
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
