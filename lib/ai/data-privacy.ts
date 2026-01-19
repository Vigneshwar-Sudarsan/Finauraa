/**
 * Data privacy utilities for AI interactions
 * Anonymizes and aggregates financial data before sending to AI
 */

import { createClient } from "@/lib/supabase/server";

export interface AnonymizedContext {
  hasBankConnected: boolean;
  accountSummary?: {
    totalBalance: "low" | "medium" | "high" | "very_high";
    accountCount: number;
    currency: string;
  };
  spendingSummary?: {
    weeklyTrend: "below_average" | "average" | "above_average";
    topCategories: string[];
    currency: string;
  };
  budgetSummary?: {
    activeBudgets: number;
    budgetsNearLimit: string[]; // Category names only
    budgetsExceeded: string[]; // Category names only
  };
}

/**
 * Categorize balance into buckets instead of exact amounts
 * This prevents exact financial data from being sent to AI
 */
function categorizeBalance(balance: number, currency: string): "low" | "medium" | "high" | "very_high" {
  // Thresholds in BHD (adjust for other currencies)
  const thresholds = {
    BHD: { low: 500, medium: 2000, high: 10000 },
    USD: { low: 1300, medium: 5300, high: 26500 },
    EUR: { low: 1200, medium: 4800, high: 24000 },
  };

  const t = thresholds[currency as keyof typeof thresholds] || thresholds.BHD;

  if (balance < t.low) return "low";
  if (balance < t.medium) return "medium";
  if (balance < t.high) return "high";
  return "very_high";
}

/**
 * Categorize spending trend
 */
function categorizeSpendingTrend(
  currentWeekSpending: number,
  averageWeeklySpending: number
): "below_average" | "average" | "above_average" {
  if (averageWeeklySpending === 0) return "average";

  const ratio = currentWeekSpending / averageWeeklySpending;

  if (ratio < 0.8) return "below_average";
  if (ratio > 1.2) return "above_average";
  return "average";
}

/**
 * Fetch and anonymize user's financial context from database
 * This is the ONLY source of truth - never trust client-sent data
 */
export async function getAnonymizedUserContext(userId: string): Promise<AnonymizedContext> {
  const supabase = await createClient();

  // Check if user has any bank connections
  const { data: connections } = await supabase
    .from("bank_connections")
    .select("id, status")
    .eq("user_id", userId)
    .eq("status", "active");

  const hasBankConnected = (connections?.length ?? 0) > 0;

  if (!hasBankConnected) {
    return { hasBankConnected: false };
  }

  // Get account summary (aggregated, not exact)
  const { data: accounts } = await supabase
    .from("bank_accounts")
    .select("balance, currency")
    .eq("user_id", userId);

  let accountSummary: AnonymizedContext["accountSummary"];
  if (accounts && accounts.length > 0) {
    const totalBalance = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
    const currency = accounts[0].currency || "BHD";

    accountSummary = {
      totalBalance: categorizeBalance(totalBalance, currency),
      accountCount: accounts.length,
      currency,
    };
  }

  // Get spending summary (categories only, no amounts)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: transactions } = await supabase
    .from("transactions")
    .select("amount, category, transaction_date, currency")
    .eq("user_id", userId)
    .eq("transaction_type", "debit")
    .gte("transaction_date", thirtyDaysAgo.toISOString());

  let spendingSummary: AnonymizedContext["spendingSummary"];
  if (transactions && transactions.length > 0) {
    // Get top categories by frequency (not amount)
    const categoryCount: Record<string, number> = {};
    transactions.forEach((t) => {
      if (t.category) {
        categoryCount[t.category] = (categoryCount[t.category] || 0) + 1;
      }
    });

    const topCategories = Object.entries(categoryCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([category]) => category);

    // Calculate spending trend (relative, not absolute)
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);

    const thisWeekSpending = transactions
      .filter((t) => new Date(t.transaction_date) >= weekAgo)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const lastFourWeeksTransactions = transactions.filter(
      (t) => new Date(t.transaction_date) >= fourWeeksAgo && new Date(t.transaction_date) < weekAgo
    );
    const avgWeeklySpending = lastFourWeeksTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0) / 3;

    spendingSummary = {
      weeklyTrend: categorizeSpendingTrend(thisWeekSpending, avgWeeklySpending),
      topCategories,
      currency: transactions[0]?.currency || "BHD",
    };
  }

  // Get budget summary (status only, no amounts)
  const { data: budgets } = await supabase
    .from("budgets")
    .select("id, category, amount, start_date, end_date, currency")
    .eq("user_id", userId)
    .eq("is_active", true);

  let budgetSummary: AnonymizedContext["budgetSummary"];
  if (budgets && budgets.length > 0) {
    const budgetsNearLimit: string[] = [];
    const budgetsExceeded: string[] = [];

    // For each budget, calculate spent amount
    for (const budget of budgets) {
      const { data: spent } = await supabase.rpc("calculate_budget_spent", {
        p_user_id: userId,
        p_category: budget.category,
        p_start_date: budget.start_date,
        p_end_date: budget.end_date || new Date().toISOString().split("T")[0],
      });

      const spentAmount = spent || 0;
      const percentage = (spentAmount / budget.amount) * 100;

      if (percentage >= 100) {
        budgetsExceeded.push(budget.category);
      } else if (percentage >= 80) {
        budgetsNearLimit.push(budget.category);
      }
    }

    budgetSummary = {
      activeBudgets: budgets.length,
      budgetsNearLimit,
      budgetsExceeded,
    };
  }

  return {
    hasBankConnected,
    accountSummary,
    spendingSummary,
    budgetSummary,
  };
}

/**
 * Format anonymized context for AI prompt
 * Only includes categorical/relative information, never exact amounts
 */
export function formatContextForAI(context: AnonymizedContext): string {
  if (!context.hasBankConnected) {
    return "\n\nUSER CONTEXT:\n- Bank connected: No\n- User needs to connect their bank to see financial data";
  }

  let contextStr = "\n\nUSER CONTEXT:\n- Bank connected: Yes";

  if (context.accountSummary) {
    const balanceDescriptions = {
      low: "relatively low",
      medium: "moderate",
      high: "healthy",
      very_high: "substantial",
    };
    contextStr += `\n- Account balance: ${balanceDescriptions[context.accountSummary.totalBalance]}`;
    contextStr += `\n- Number of accounts: ${context.accountSummary.accountCount}`;
  }

  if (context.spendingSummary) {
    const trendDescriptions = {
      below_average: "spending less than usual this week",
      average: "spending is typical this week",
      above_average: "spending more than usual this week",
    };
    contextStr += `\n- Spending trend: ${trendDescriptions[context.spendingSummary.weeklyTrend]}`;
    if (context.spendingSummary.topCategories.length > 0) {
      contextStr += `\n- Frequent spending categories: ${context.spendingSummary.topCategories.join(", ")}`;
    }
  }

  if (context.budgetSummary) {
    contextStr += `\n- Active budgets: ${context.budgetSummary.activeBudgets}`;
    if (context.budgetSummary.budgetsExceeded.length > 0) {
      contextStr += `\n- Budgets exceeded: ${context.budgetSummary.budgetsExceeded.join(", ")}`;
    }
    if (context.budgetSummary.budgetsNearLimit.length > 0) {
      contextStr += `\n- Budgets near limit (80%+): ${context.budgetSummary.budgetsNearLimit.join(", ")}`;
    }
  }

  return contextStr;
}
