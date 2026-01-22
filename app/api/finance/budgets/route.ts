import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireBankConsent } from "@/lib/consent-middleware";

/**
 * GET /api/finance/budgets
 * Fetches all budgets for the user with spent amounts calculated
 * BOBF/PDPL: Requires active bank_access consent (accesses transaction data)
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

    // BOBF/PDPL: Verify active consent before data access
    const consentCheck = await requireBankConsent(supabase, user.id, "/api/finance/budgets");
    if (!consentCheck.allowed) {
      return consentCheck.response;
    }

    // Get all active budgets for the user
    const { data: budgets, error: budgetsError } = await supabase
      .from("budgets")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (budgetsError) {
      console.error("Failed to fetch budgets:", budgetsError);
      return NextResponse.json(
        { error: "Failed to fetch budgets" },
        { status: 500 }
      );
    }

    if (!budgets || budgets.length === 0) {
      return NextResponse.json({ budgets: [] });
    }

    // Calculate spent amount for each budget from transactions
    const budgetsWithSpent = await Promise.all(
      budgets.map(async (budget) => {
        // Get start of current month for monthly budgets
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        // Fetch debit transactions for this category in the current period
        const { data: transactions } = await supabase
          .from("transactions")
          .select("amount")
          .eq("user_id", user.id)
          .eq("transaction_type", "debit")
          .eq("category", budget.category)
          .gte("transaction_date", startOfMonth.toISOString());

        const spent = (transactions || []).reduce(
          (sum, t) => sum + Math.abs(t.amount),
          0
        );

        return {
          ...budget,
          spent,
          remaining: Math.max(0, budget.amount - spent),
          percentage: budget.amount > 0 ? Math.round((spent / budget.amount) * 100) : 0,
        };
      })
    );

    return NextResponse.json({ budgets: budgetsWithSpent });
  } catch (error) {
    console.error("Budgets fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch budgets" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/finance/budgets
 * Creates or updates a budget for a category
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

    const body = await request.json();
    const { category, amount, currency = "BHD" } = body;

    if (!category || typeof amount !== "number" || amount <= 0) {
      return NextResponse.json(
        { error: "Invalid category or amount" },
        { status: 400 }
      );
    }

    // Normalize category to lowercase
    const normalizedCategory = category.toLowerCase();

    // Check if budget already exists for this category
    const { data: existingBudget } = await supabase
      .from("budgets")
      .select("id")
      .eq("user_id", user.id)
      .eq("category", normalizedCategory)
      .eq("is_active", true)
      .single();

    let result;

    if (existingBudget) {
      // Update existing budget
      const { data, error } = await supabase
        .from("budgets")
        .update({
          amount,
          currency,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingBudget.id)
        .select()
        .single();

      if (error) {
        console.error("Failed to update budget:", error);
        return NextResponse.json(
          { error: "Failed to update budget" },
          { status: 500 }
        );
      }
      result = data;
    } else {
      // Create new budget
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const { data, error } = await supabase
        .from("budgets")
        .insert({
          user_id: user.id,
          category: normalizedCategory,
          amount,
          currency,
          period: "monthly",
          is_active: true,
          start_date: startOfMonth.toISOString().split('T')[0],
        })
        .select()
        .single();

      if (error) {
        console.error("Failed to create budget:", error);
        return NextResponse.json(
          { error: "Failed to create budget" },
          { status: 500 }
        );
      }
      result = data;
    }

    // Calculate current spent amount
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const { data: transactions } = await supabase
      .from("transactions")
      .select("amount")
      .eq("user_id", user.id)
      .eq("transaction_type", "debit")
      .eq("category", normalizedCategory)
      .gte("transaction_date", startOfMonth.toISOString());

    const spent = (transactions || []).reduce(
      (sum, t) => sum + Math.abs(t.amount),
      0
    );

    return NextResponse.json({
      budget: {
        ...result,
        spent,
        remaining: Math.max(0, result.amount - spent),
        percentage: result.amount > 0 ? Math.round((spent / result.amount) * 100) : 0,
      },
    });
  } catch (error) {
    console.error("Budget creation error:", error);
    return NextResponse.json(
      { error: "Failed to create budget" },
      { status: 500 }
    );
  }
}
