import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createTarabutClient } from "@/lib/tarabut/client";
import { requireBankConsent } from "@/lib/consent-middleware";

/**
 * GET /api/finance/insights/spending
 * Fetches transaction insights (spending summary) from Tarabut Insights API
 * BOBF/PDPL: Requires active bank_access consent
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
    const consentCheck = await requireBankConsent(supabase, user.id, "/api/finance/insights/spending");
    if (!consentCheck.allowed) {
      return consentCheck.response;
    }

    // Check if user has bank connections
    const { data: connections } = await supabase
      .from("bank_connections")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1);

    if (!connections || connections.length === 0) {
      return NextResponse.json({
        error: "No bank connections",
        totalSpending: 0,
        totalIncome: 0,
        currency: "BHD",
        categories: [],
      });
    }

    // Get access token for user
    const tarabut = createTarabutClient();
    const tokenResponse = await tarabut.getAccessToken(user.id);

    // Fetch transaction insights from Tarabut
    const insights = await tarabut.getTransactionInsightsSummary(tokenResponse.accessToken);

    return NextResponse.json({
      totalSpending: insights.totalSpending,
      totalIncome: insights.totalIncome,
      currency: insights.currency,
      period: insights.period,
      categories: insights.categories.map((cat) => ({
        id: cat.categoryId,
        name: cat.categoryName,
        amount: cat.amount,
        count: cat.count,
        percentage: cat.percentage,
      })),
      topMerchants: insights.topMerchants || [],
    });
  } catch (error) {
    console.error("Failed to fetch spending insights:", error);

    // Fallback to local data if Tarabut API fails
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      // Get all transactions (debit for spending)
      const { data: debitTransactions } = await supabase
        .from("transactions")
        .select("amount, category, currency, transaction_date")
        .eq("user_id", user.id)
        .eq("transaction_type", "debit")
        .order("transaction_date", { ascending: false });

      // Get all credit transactions for income
      const { data: creditTransactions } = await supabase
        .from("transactions")
        .select("amount, currency, transaction_date")
        .eq("user_id", user.id)
        .eq("transaction_type", "credit")
        .order("transaction_date", { ascending: false });

      const transactions = debitTransactions || [];
      const incomeTransactions = creditTransactions || [];

      if (transactions.length === 0 && incomeTransactions.length === 0) {
        return NextResponse.json({
          totalSpending: 0,
          totalIncome: 0,
          currency: "BHD",
          categories: [],
          fallback: true,
        });
      }

      const totalSpending = transactions.reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);
      const totalIncome = incomeTransactions.reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);

      // Group spending by category
      const categoryTotals: Record<string, { amount: number; count: number }> = {};
      transactions.forEach((t) => {
        const cat = t.category || "Other";
        if (!categoryTotals[cat]) {
          categoryTotals[cat] = { amount: 0, count: 0 };
        }
        categoryTotals[cat].amount += Math.abs(Number(t.amount));
        categoryTotals[cat].count += 1;
      });

      const categories = Object.entries(categoryTotals)
        .sort((a, b) => b[1].amount - a[1].amount)
        .map(([name, data]) => ({
          id: name.toLowerCase().replace(/\s+/g, "_"),
          name,
          amount: data.amount,
          count: data.count,
          percentage: totalSpending > 0 ? Math.round((data.amount / totalSpending) * 100) : 0,
        }));

      // Group income by category/source
      const { data: incomeWithCategory } = await supabase
        .from("transactions")
        .select("amount, category, currency")
        .eq("user_id", user.id)
        .eq("transaction_type", "credit");

      const incomeTotals: Record<string, { amount: number; count: number }> = {};
      (incomeWithCategory || []).forEach((t) => {
        const cat = t.category || "Other Income";
        if (!incomeTotals[cat]) {
          incomeTotals[cat] = { amount: 0, count: 0 };
        }
        incomeTotals[cat].amount += Math.abs(Number(t.amount));
        incomeTotals[cat].count += 1;
      });

      const incomeSources = Object.entries(incomeTotals)
        .sort((a, b) => b[1].amount - a[1].amount)
        .map(([type, data]) => ({
          type,
          amount: data.amount,
          count: data.count,
          percentage: totalIncome > 0 ? Math.round((data.amount / totalIncome) * 100) : 0,
        }));

      // Calculate period from transactions
      const allDates = [...transactions, ...incomeTransactions]
        .map((t) => t.transaction_date)
        .filter(Boolean)
        .sort();

      const period = allDates.length > 0
        ? { from: allDates[0], to: allDates[allDates.length - 1] }
        : undefined;

      return NextResponse.json({
        totalSpending,
        totalIncome,
        currency: transactions[0]?.currency || incomeTransactions[0]?.currency || "BHD",
        categories,
        incomeSources,
        period,
        fallback: true,
      });
    } catch {
      return NextResponse.json(
        { error: "Failed to fetch spending insights" },
        { status: 500 }
      );
    }
  }
}
