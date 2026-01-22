import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireBankConsent, logDataAccessSuccess } from "@/lib/consent-middleware";

/**
 * Secure API endpoint to fetch user's financial summary
 * This data is displayed in the UI cards - never sent to AI
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
    const consentCheck = await requireBankConsent(supabase, user.id, "/api/finance/summary");
    if (!consentCheck.allowed) {
      return consentCheck.response;
    }

    // If no banks connected, return empty data (not an error)
    if (consentCheck.noBanksConnected) {
      return NextResponse.json({
        hasBankConnected: false,
        accounts: [],
        totalBalance: 0,
        recentSpending: null,
        budgets: [],
        noBanksConnected: true,
      });
    }

    // Get user profile for ai_data_mode
    const { data: profile } = await supabase
      .from("profiles")
      .select("ai_data_mode")
      .eq("id", user.id)
      .single();

    // Check if user has bank connections
    const { data: connections } = await supabase
      .from("bank_connections")
      .select("id, bank_id, bank_name, status")
      .eq("user_id", user.id)
      .eq("status", "active");

    const hasBankConnected = (connections?.length ?? 0) > 0;
    const aiDataMode = profile?.ai_data_mode || null;

    if (!hasBankConnected) {
      return NextResponse.json({
        hasBankConnected: false,
        aiDataMode,
        accounts: [],
        totalBalance: 0,
        recentSpending: null,
        budgets: [],
      });
    }

    // Get all accounts with balances
    const { data: accounts } = await supabase
      .from("bank_accounts")
      .select(`
        id,
        account_type,
        account_number,
        balance,
        available_balance,
        currency,
        connection_id,
        bank_connections (
          bank_id,
          bank_name
        )
      `)
      .eq("user_id", user.id);

    interface BankConnection {
      bank_id: string;
      bank_name: string;
    }

    const formattedAccounts = (accounts || []).map((acc) => {
      const bankConn = acc.bank_connections as unknown as BankConnection | null;
      return {
        id: acc.id,
        bankId: bankConn?.bank_id,
        bankName: bankConn?.bank_name,
        accountType: acc.account_type,
        accountNumber: acc.account_number,
        balance: acc.balance || 0,
        availableBalance: acc.available_balance || 0,
        currency: acc.currency,
      };
    });

    const totalBalance = formattedAccounts.reduce(
      (sum, acc) => sum + acc.balance,
      0
    );

    // Get recent spending (last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const { data: recentTransactions } = await supabase
      .from("transactions")
      .select("amount, category, transaction_date, currency")
      .eq("user_id", user.id)
      .eq("transaction_type", "debit")
      .gte("transaction_date", weekAgo.toISOString())
      .order("transaction_date", { ascending: false });

    let recentSpending = null;
    if (recentTransactions && recentTransactions.length > 0) {
      const totalAmount = recentTransactions.reduce(
        (sum, t) => sum + Math.abs(t.amount),
        0
      );

      // Group by category
      const categoryTotals: Record<string, number> = {};
      recentTransactions.forEach((t) => {
        const cat = t.category || "Other";
        categoryTotals[cat] = (categoryTotals[cat] || 0) + Math.abs(t.amount);
      });

      const topCategories = Object.entries(categoryTotals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name, amount]) => ({ name, amount }));

      recentSpending = {
        amount: totalAmount,
        currency: recentTransactions[0]?.currency || "BHD",
        period: "This week",
        topCategories,
      };
    }

    // Get active budgets with spent amounts
    const { data: budgets } = await supabase
      .from("budgets")
      .select("id, category, amount, currency, start_date, end_date")
      .eq("user_id", user.id)
      .eq("is_active", true);

    const budgetsWithSpent = await Promise.all(
      (budgets || []).map(async (budget) => {
        const { data: spent } = await supabase.rpc("calculate_budget_spent", {
          p_user_id: user.id,
          p_category: budget.category,
          p_start_date: budget.start_date,
          p_end_date: budget.end_date || new Date().toISOString().split("T")[0],
        });

        return {
          id: budget.id,
          category: budget.category,
          limit: budget.amount,
          spent: spent || 0,
          currency: budget.currency,
        };
      })
    );

    return NextResponse.json({
      hasBankConnected: true,
      aiDataMode,
      accounts: formattedAccounts,
      totalBalance,
      accountCount: formattedAccounts.length,
      currency: formattedAccounts[0]?.currency || "BHD",
      recentSpending,
      budgets: budgetsWithSpent,
    });
  } catch (error) {
    console.error("Finance summary error:", error);
    return NextResponse.json(
      { error: "Failed to fetch financial data" },
      { status: 500 }
    );
  }
}
