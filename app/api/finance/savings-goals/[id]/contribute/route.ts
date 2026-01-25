import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/finance/savings-goals/[id]/contribute
 * Adds a contribution to a savings goal
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch the existing goal
    const { data: existingGoal, error: fetchError } = await supabase
      .from("savings_goals")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !existingGoal) {
      return NextResponse.json(
        { error: "Savings goal not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { amount } = body;

    // Validate amount
    if (typeof amount !== "number" || amount <= 0) {
      return NextResponse.json(
        { error: "Amount must be a positive number" },
        { status: 400 }
      );
    }

    // Calculate new amount
    const newCurrentAmount = existingGoal.current_amount + amount;
    const isCompleted = newCurrentAmount >= existingGoal.target_amount;

    // Update the goal
    const { data: goal, error } = await supabase
      .from("savings_goals")
      .update({
        current_amount: newCurrentAmount,
        is_completed: isCompleted,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Failed to add contribution:", error);
      return NextResponse.json(
        { error: "Failed to add contribution" },
        { status: 500 }
      );
    }

    // Record contribution history entry
    await supabase
      .from("contribution_history")
      .insert({
        goal_id: id,
        contributor_id: user.id,
        recorded_by_id: user.id,
        amount,
        currency: existingGoal.currency || "BHD",
      });

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
      contribution: {
        amount,
        previous_amount: existingGoal.current_amount,
        new_amount: newCurrentAmount,
        just_completed: isCompleted && !existingGoal.is_completed,
      },
    });
  } catch (error) {
    console.error("Contribution error:", error);
    return NextResponse.json(
      { error: "Failed to add contribution" },
      { status: 500 }
    );
  }
}
