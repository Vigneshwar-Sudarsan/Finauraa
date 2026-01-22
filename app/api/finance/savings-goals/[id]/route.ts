import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireBankConsent } from "@/lib/consent-middleware";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/finance/savings-goals/[id]
 * Fetches a single savings goal
 * BOBF/PDPL: Requires active bank_access consent
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

    // BOBF/PDPL: Verify active consent before data access
    const consentCheck = await requireBankConsent(supabase, user.id, `/api/finance/savings-goals/${id}`);
    if (!consentCheck.allowed) {
      return consentCheck.response;
    }

    const { data: goal, error } = await supabase
      .from("savings_goals")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error || !goal) {
      return NextResponse.json(
        { error: "Savings goal not found" },
        { status: 404 }
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
    console.error("Savings goal fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch savings goal" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/finance/savings-goals/[id]
 * Updates a savings goal
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
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
    const {
      name,
      target_amount,
      current_amount,
      target_date,
      category,
      is_completed,
      auto_contribute,
      auto_contribute_percentage,
    } = body;

    // Build update object with only provided fields
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length === 0) {
        return NextResponse.json(
          { error: "Goal name cannot be empty" },
          { status: 400 }
        );
      }
      updates.name = name.trim();
    }

    if (target_amount !== undefined) {
      if (typeof target_amount !== "number" || target_amount <= 0) {
        return NextResponse.json(
          { error: "Target amount must be a positive number" },
          { status: 400 }
        );
      }
      updates.target_amount = target_amount;
    }

    if (current_amount !== undefined) {
      if (typeof current_amount !== "number" || current_amount < 0) {
        return NextResponse.json(
          { error: "Current amount cannot be negative" },
          { status: 400 }
        );
      }
      updates.current_amount = current_amount;
    }

    if (target_date !== undefined) {
      updates.target_date = target_date
        ? new Date(target_date).toISOString().split("T")[0]
        : null;
    }

    if (category !== undefined) {
      updates.category = category || null;
    }

    if (is_completed !== undefined) {
      updates.is_completed = Boolean(is_completed);
    }

    if (auto_contribute !== undefined) {
      updates.auto_contribute = Boolean(auto_contribute);
    }

    if (auto_contribute_percentage !== undefined) {
      if (auto_contribute_percentage !== null && (auto_contribute_percentage <= 0 || auto_contribute_percentage > 100)) {
        return NextResponse.json(
          { error: "Auto-contribute percentage must be between 1 and 100" },
          { status: 400 }
        );
      }
      updates.auto_contribute_percentage = auto_contribute_percentage;
    }

    // Check if goal is completed
    const newCurrentAmount = updates.current_amount ?? existingGoal.current_amount;
    const newTargetAmount = updates.target_amount ?? existingGoal.target_amount;
    if (newCurrentAmount >= newTargetAmount) {
      updates.is_completed = true;
    }

    const { data: goal, error } = await supabase
      .from("savings_goals")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Failed to update savings goal:", error);
      return NextResponse.json(
        { error: "Failed to update savings goal" },
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
    console.error("Savings goal update error:", error);
    return NextResponse.json(
      { error: "Failed to update savings goal" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/finance/savings-goals/[id]
 * Deletes a savings goal
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await supabase
      .from("savings_goals")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error("Failed to delete savings goal:", error);
      return NextResponse.json(
        { error: "Failed to delete savings goal" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Savings goal delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete savings goal" },
      { status: 500 }
    );
  }
}
