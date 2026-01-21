import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SubscriptionTier, getTierLimits } from "@/lib/features";

/**
 * GET /api/finance/savings-goals
 * Fetches all savings goals for the user with calculated progress
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

    const { data: goals, error } = await supabase
      .from("savings_goals")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch savings goals:", error);
      return NextResponse.json(
        { error: "Failed to fetch savings goals" },
        { status: 500 }
      );
    }

    // Calculate additional fields for each goal
    const goalsWithProgress = (goals || []).map((goal) => {
      const progress_percentage =
        goal.target_amount > 0
          ? Math.min(100, Math.round((goal.current_amount / goal.target_amount) * 100))
          : 0;

      const remaining = Math.max(0, goal.target_amount - goal.current_amount);

      let days_remaining: number | null = null;
      if (goal.target_date) {
        const targetDate = new Date(goal.target_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const diffTime = targetDate.getTime() - today.getTime();
        days_remaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }

      return {
        ...goal,
        progress_percentage,
        remaining,
        days_remaining,
      };
    });

    return NextResponse.json({ goals: goalsWithProgress });
  } catch (error) {
    console.error("Savings goals fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch savings goals" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/finance/savings-goals
 * Creates a new savings goal
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

    // Check subscription tier and savings goal limits
    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_tier, is_pro")
      .eq("id", user.id)
      .single();

    const tier: SubscriptionTier = profile?.subscription_tier || (profile?.is_pro ? "pro" : "free");
    const tierLimits = getTierLimits(tier);
    const goalLimit = tierLimits.savingsGoals;

    // Count existing goals (only if there's a limit)
    if (goalLimit !== null) {
      const { count: existingGoals } = await supabase
        .from("savings_goals")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);

      if ((existingGoals || 0) >= goalLimit) {
        const upgradeMessage = tier === "free"
          ? "Upgrade to Pro for unlimited savings goals."
          : "You've reached the maximum savings goals for your plan.";

        return NextResponse.json(
          {
            error: `Savings goal limit reached (${goalLimit}). ${upgradeMessage}`,
            limit: goalLimit,
            used: existingGoals,
            upgradeRequired: tier === "free",
          },
          { status: 403 }
        );
      }
    }

    const body = await request.json();
    const {
      name,
      target_amount,
      current_amount = 0,
      currency = "BHD",
      target_date,
      category,
      auto_contribute = false,
      auto_contribute_percentage,
    } = body;

    // Validate required fields
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Goal name is required" },
        { status: 400 }
      );
    }

    if (typeof target_amount !== "number" || target_amount <= 0) {
      return NextResponse.json(
        { error: "Target amount must be a positive number" },
        { status: 400 }
      );
    }

    if (auto_contribute && (typeof auto_contribute_percentage !== "number" || auto_contribute_percentage <= 0 || auto_contribute_percentage > 100)) {
      return NextResponse.json(
        { error: "Auto-contribute percentage must be between 1 and 100" },
        { status: 400 }
      );
    }

    const { data: goal, error } = await supabase
      .from("savings_goals")
      .insert({
        user_id: user.id,
        name: name.trim(),
        target_amount,
        current_amount: Math.max(0, current_amount),
        currency,
        target_date: target_date ? new Date(target_date).toISOString().split("T")[0] : null,
        category: category || null,
        is_completed: current_amount >= target_amount,
        auto_contribute,
        auto_contribute_percentage: auto_contribute ? auto_contribute_percentage : null,
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to create savings goal:", error);
      return NextResponse.json(
        { error: "Failed to create savings goal" },
        { status: 500 }
      );
    }

    // Calculate progress fields
    const progress_percentage = Math.min(
      100,
      Math.round((goal.current_amount / goal.target_amount) * 100)
    );
    const remaining = Math.max(0, goal.target_amount - goal.current_amount);

    let days_remaining: number | null = null;
    if (goal.target_date) {
      const targetDate = new Date(goal.target_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diffTime = targetDate.getTime() - today.getTime();
      days_remaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    return NextResponse.json({
      goal: {
        ...goal,
        progress_percentage,
        remaining,
        days_remaining,
      },
    });
  } catch (error) {
    console.error("Savings goal creation error:", error);
    return NextResponse.json(
      { error: "Failed to create savings goal" },
      { status: 500 }
    );
  }
}
