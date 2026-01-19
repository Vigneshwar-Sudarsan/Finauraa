import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/finance/spending
 * Fetches spending analysis for a given period
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get period from query params (default: 90 days)
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get("days") || "90", 10);
    const accountId = searchParams.get("account_id");

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Build query for debit transactions
    let query = supabase
      .from("transactions")
      .select("amount, category, currency, transaction_date, account_id")
      .eq("user_id", user.id)
      .eq("transaction_type", "debit")
      .gte("transaction_date", startDate.toISOString())
      .order("transaction_date", { ascending: false });

    // Filter by account if specified
    if (accountId) {
      query = query.eq("account_id", accountId);
    }

    const { data: transactions, error } = await query;

    if (error) {
      console.error("Failed to fetch transactions:", error);
      return NextResponse.json(
        { error: "Failed to fetch spending data" },
        { status: 500 }
      );
    }

    if (!transactions || transactions.length === 0) {
      return NextResponse.json({
        totalSpent: 0,
        currency: "BHD",
        period: `Last ${days} days`,
        categories: [],
        topCategory: null,
        transactionCount: 0,
      });
    }

    // Calculate total spent
    const totalSpent = transactions.reduce(
      (sum, t) => sum + Math.abs(t.amount),
      0
    );

    // Group by category
    const categoryTotals: Record<string, number> = {};
    transactions.forEach((t) => {
      const cat = t.category || "other";
      categoryTotals[cat] = (categoryTotals[cat] || 0) + Math.abs(t.amount);
    });

    // Sort categories by amount and calculate percentages
    const sortedCategories = Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: Math.round((amount / totalSpent) * 100),
      }));

    const topCategory = sortedCategories[0]?.category || null;
    const currency = transactions[0]?.currency || "BHD";

    // Format period label
    let periodLabel = `Last ${days} days`;
    if (days === 7) periodLabel = "This week";
    if (days === 30) periodLabel = "This month";
    if (days === 90) periodLabel = "Last 3 months";

    return NextResponse.json({
      totalSpent,
      currency,
      period: periodLabel,
      categories: sortedCategories,
      topCategory,
      transactionCount: transactions.length,
    });
  } catch (error) {
    console.error("Spending analysis error:", error);
    return NextResponse.json(
      { error: "Failed to analyze spending" },
      { status: 500 }
    );
  }
}
