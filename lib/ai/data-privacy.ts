/**
 * Data privacy utilities for AI interactions
 * Supports two modes:
 * 1. Privacy-First (default): Anonymizes and aggregates financial data
 * 2. Enhanced AI: Shares full transaction data with explicit user consent
 */

import { createClient } from "@/lib/supabase/server";

export type AIDataMode = 'privacy-first' | 'enhanced';

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

export interface EnhancedContext {
  hasBankConnected: boolean;
  accounts?: Array<{
    id: string;
    name: string;
    balance: number;
    currency: string;
    accountType: string;
  }>;
  recentTransactions?: Array<{
    id: string;
    amount: number;
    merchant: string;
    category: string;
    date: string;
    type: 'credit' | 'debit';
  }>;
  budgets?: Array<{
    category: string;
    limit: number;
    spent: number;
    remaining: number;
    percentageUsed: number;
  }>;
  savingsGoals?: Array<{
    name: string;
    targetAmount: number;
    currentAmount: number;
    progress: number;
  }>;
  monthlyIncome?: number;
  monthlyExpenses?: number;
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

  if (context.budgetSummary && context.budgetSummary.activeBudgets > 0) {
    contextStr += `\n- Active budgets: ${context.budgetSummary.activeBudgets}`;
    if (context.budgetSummary.budgetsExceeded.length > 0) {
      contextStr += `\n- Budgets exceeded: ${context.budgetSummary.budgetsExceeded.join(", ")}`;
    }
    if (context.budgetSummary.budgetsNearLimit.length > 0) {
      contextStr += `\n- Budgets near limit (80%+): ${context.budgetSummary.budgetsNearLimit.join(", ")}`;
    }
  } else {
    contextStr += `\n- Active budgets: 0 (user has not set up any budgets)`;
  }

  contextStr += `\n\n---END OF USER DATA---`;
  contextStr += `\nIMPORTANT: This is ALL the data available. If something is not listed above (like a specific budget category), it does NOT exist.`;

  return contextStr;
}

/**
 * Fetch FULL financial context for Enhanced AI mode
 * Only called when user has explicitly consented and is on Pro tier
 * Provides complete transaction data for better AI insights
 */
export async function getEnhancedUserContext(userId: string): Promise<EnhancedContext> {
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

  // Get full account data with exact balances
  const { data: accounts } = await supabase
    .from("bank_accounts")
    .select("id, account_name, balance, currency, account_type")
    .eq("user_id", userId);

  const accountsData = accounts?.map(acc => ({
    id: acc.id,
    name: acc.account_name || "Account",
    balance: acc.balance || 0,
    currency: acc.currency || "BHD",
    accountType: acc.account_type || "checking"
  }));

  // Get recent transactions (last 100)
  const { data: transactions } = await supabase
    .from("transactions")
    .select("id, amount, merchant_name, category, transaction_date, transaction_type")
    .eq("user_id", userId)
    .order("transaction_date", { ascending: false })
    .limit(100);

  const transactionsData = transactions?.map(t => ({
    id: t.id,
    amount: Math.abs(t.amount),
    merchant: t.merchant_name || "Unknown",
    category: t.category || "Other",
    date: t.transaction_date,
    type: t.transaction_type as 'credit' | 'debit'
  }));

  // Get budgets with current spending
  const { data: budgets } = await supabase
    .from("budgets")
    .select("id, category, amount, start_date, end_date, currency")
    .eq("user_id", userId)
    .eq("is_active", true);

  const budgetsData = await Promise.all(
    (budgets || []).map(async (budget) => {
      const { data: spent } = await supabase.rpc("calculate_budget_spent", {
        p_user_id: userId,
        p_category: budget.category,
        p_start_date: budget.start_date,
        p_end_date: budget.end_date || new Date().toISOString().split("T")[0],
      });

      const spentAmount = spent || 0;
      const remaining = budget.amount - spentAmount;
      const percentageUsed = (spentAmount / budget.amount) * 100;

      return {
        category: budget.category,
        limit: budget.amount,
        spent: spentAmount,
        remaining: remaining,
        percentageUsed: Math.round(percentageUsed)
      };
    })
  );

  // Get savings goals
  const { data: goals } = await supabase
    .from("savings_goals")
    .select("id, goal_name, target_amount, current_amount, currency")
    .eq("user_id", userId)
    .eq("is_active", true);

  const goalsData = goals?.map(g => ({
    name: g.goal_name,
    targetAmount: g.target_amount,
    currentAmount: g.current_amount || 0,
    progress: Math.round(((g.current_amount || 0) / g.target_amount) * 100)
  }));

  // Calculate monthly income and expenses (from last 90 days, averaged to monthly)
  // Using same 90-day window for both ensures consistent data capture
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  // Get all transactions from last 90 days
  const { data: quarterTransactions } = await supabase
    .from("transactions")
    .select("amount, transaction_type")
    .eq("user_id", userId)
    .gte("transaction_date", ninetyDaysAgo.toISOString());

  // Calculate income from 90 days and average to monthly
  const quarterIncome = (quarterTransactions || [])
    .filter(t => t.transaction_type === "credit")
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const monthlyIncome = Math.round((quarterIncome / 3) * 1000) / 1000;

  // Calculate expenses from 90 days and average to monthly
  const quarterExpenses = (quarterTransactions || [])
    .filter(t => t.transaction_type === "debit")
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const monthlyExpenses = Math.round((quarterExpenses / 3) * 1000) / 1000;

  return {
    hasBankConnected,
    accounts: accountsData,
    recentTransactions: transactionsData,
    budgets: budgetsData,
    savingsGoals: goalsData,
    monthlyIncome,
    monthlyExpenses
  };
}

/**
 * Format enhanced context for AI prompt with full data
 * Includes exact amounts, merchant names, and transaction details
 */
export function formatEnhancedContextForAI(context: EnhancedContext): string {
  if (!context.hasBankConnected) {
    return "\n\nUSER CONTEXT:\n- Bank connected: No\n- User needs to connect their bank to see financial data";
  }

  let contextStr = "\n\nUSER CONTEXT (Enhanced AI Mode - Full Data Access):\n- Bank connected: Yes";

  // Accounts with exact balances
  if (context.accounts && context.accounts.length > 0) {
    contextStr += `\n\nACCOUNTS (${context.accounts.length} total):`;
    context.accounts.forEach(acc => {
      contextStr += `\n- ${acc.name}: ${acc.balance.toFixed(3)} ${acc.currency} (${acc.accountType})`;
    });
    const totalBalance = context.accounts.reduce((sum, acc) => sum + acc.balance, 0);
    contextStr += `\n- Total Balance: ${totalBalance.toFixed(3)} ${context.accounts[0].currency}`;
  }

  // Monthly cash flow
  if (context.monthlyIncome !== undefined && context.monthlyExpenses !== undefined) {
    contextStr += `\n\nMONTHLY CASH FLOW (Last 30 days):`;
    contextStr += `\n- Income: ${context.monthlyIncome.toFixed(3)} BHD`;
    contextStr += `\n- Expenses: ${context.monthlyExpenses.toFixed(3)} BHD`;
    contextStr += `\n- Net: ${(context.monthlyIncome - context.monthlyExpenses).toFixed(3)} BHD`;
  }

  // Budgets with exact amounts - ALWAYS include this section
  if (context.budgets && context.budgets.length > 0) {
    contextStr += `\n\nBUDGETS (${context.budgets.length} active):`;
    context.budgets.forEach(b => {
      contextStr += `\n- ${b.category}: ${b.spent.toFixed(3)}/${b.limit.toFixed(3)} BHD (${b.percentageUsed}% used, ${b.remaining.toFixed(3)} BHD remaining)`;
    });
  } else {
    contextStr += `\n\nBUDGETS: None set up. User has not created any budgets yet.`;
  }

  // Savings goals with exact progress - ALWAYS include this section
  if (context.savingsGoals && context.savingsGoals.length > 0) {
    contextStr += `\n\nSAVINGS GOALS:`;
    context.savingsGoals.forEach(g => {
      contextStr += `\n- ${g.name}: ${g.currentAmount.toFixed(3)}/${g.targetAmount.toFixed(3)} BHD (${g.progress}% complete)`;
    });
  } else {
    contextStr += `\n\nSAVINGS GOALS: None set up. User has not created any savings goals yet.`;
  }

  // Recent transactions (top 20 for context)
  if (context.recentTransactions && context.recentTransactions.length > 0) {
    contextStr += `\n\nRECENT TRANSACTIONS (Last 20):`;
    context.recentTransactions.slice(0, 20).forEach(t => {
      const sign = t.type === 'credit' ? '+' : '-';
      contextStr += `\n- ${t.date}: ${sign}${t.amount.toFixed(3)} BHD at ${t.merchant} (${t.category})`;
    });
  }

  contextStr += `\n\n---END OF USER DATA---`;
  contextStr += `\nIMPORTANT: The data above is COMPLETE. If something is not listed (like a budget category or savings goal), it does NOT exist. Do NOT invent or assume data that is not explicitly shown above.`;

  return contextStr;
}

/**
 * Get user's AI data mode and check if they can use enhanced AI
 * Returns mode and whether user has proper permissions
 */
export async function getUserAIDataMode(userId: string): Promise<{
  mode: AIDataMode;
  canUseEnhanced: boolean;
  isPro: boolean;
  hasConsent: boolean;
}> {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("ai_data_mode, is_pro, enhanced_ai_consent_given_at")
    .eq("id", userId)
    .single();

  const mode = (profile?.ai_data_mode as AIDataMode) || 'privacy-first';
  const isPro = profile?.is_pro ?? false;
  const hasConsent = !!profile?.enhanced_ai_consent_given_at;

  // Can only use enhanced mode if:
  // 1. User has Pro tier AND
  // 2. User has given explicit consent
  const canUseEnhanced = isPro && hasConsent;

  return {
    mode,
    canUseEnhanced,
    isPro,
    hasConsent
  };
}
