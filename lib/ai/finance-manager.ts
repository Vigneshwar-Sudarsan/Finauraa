/**
 * AI Finance Assistant - Core Intelligence Module
 *
 * This module provides the AI with comprehensive financial analysis capabilities:
 * - Spending pattern analysis
 * - Budget recommendations
 * - Cash flow predictions
 * - Savings rate calculations
 * - Financial health scoring
 * - Anomaly detection
 * - Actionable recommendations
 */

import { createClient } from "@/lib/supabase/server";

// Types for financial analysis
export interface SpendingPattern {
  category: string;
  averageMonthly: number;
  trend: "increasing" | "decreasing" | "stable";
  percentChange: number;
  lastMonthAmount: number;
  thisMonthAmount: number;
  yearlyTotal: number;
  monthlyBreakdown: Array<{ month: string; amount: number }>;
}

export interface YearlySummary {
  totalIncome: number;
  totalExpenses: number;
  totalSaved: number;
  averageMonthlyIncome: number;
  averageMonthlyExpenses: number;
  averageSavingsRate: number;
  bestSavingsMonth: { month: string; amount: number; rate: number } | null;
  worstSpendingMonth: { month: string; amount: number } | null;
  incomeByMonth: Array<{ month: string; amount: number }>;
  expensesByMonth: Array<{ month: string; amount: number }>;
  topCategories: Array<{ category: string; total: number; percentage: number }>;
}

export interface BudgetRecommendation {
  category: string;
  recommendedAmount: number;
  basedOn: "average" | "median" | "50_30_20_rule";
  reasoning: string;
  currentSpending?: number;
}

export interface CashFlowPrediction {
  nextWeekProjection: number;
  nextMonthProjection: number;
  billsDue: Array<{
    name: string;
    amount: number;
    dueDate: string;
    isRecurring: boolean;
  }>;
  lowBalanceWarning: boolean;
  projectedLowDate?: string;
}

// Aura Level thresholds for the Aura Score system
export type AuraLevel = "Radiant" | "Bright" | "Steady" | "Dim" | "Critical";

export interface FinancialHealth {
  score: number; // 0-100 (Aura Score)
  auraLevel: AuraLevel;
  factors: {
    savingsRate: { score: number; value: number; status: "good" | "warning" | "critical" };
    budgetAdherence: { score: number; value: number; status: "good" | "warning" | "critical" };
    emergencyFund: { score: number; months: number; status: "good" | "warning" | "critical" };
    spendingStability: { score: number; volatility: number; status: "good" | "warning" | "critical" };
  };
  topRecommendation: string;
}

export interface SpendingAnomaly {
  transactionId: string;
  merchant: string;
  amount: number;
  category: string;
  date: string;
  reason: "unusually_high" | "new_merchant" | "unusual_category" | "duplicate_suspected";
  typicalAmount?: number;
}

export interface FinanceManagerContext {
  // Basic info
  hasBankConnected: boolean;
  accountCount: number;
  totalBalance: number;
  currency: string;

  // Income & Expenses
  monthlyIncome: number;
  monthlyExpenses: number;
  netCashFlow: number;
  savingsRate: number;

  // Spending Analysis
  spendingPatterns: SpendingPattern[];
  topSpendingCategories: Array<{ category: string; amount: number; percentage: number }>;
  unusualSpending: SpendingAnomaly[];

  // Budgets
  budgets: Array<{
    category: string;
    limit: number;
    spent: number;
    remaining: number;
    percentUsed: number;
    daysRemaining: number;
    projectedOverspend: boolean;
  }>;
  budgetRecommendations: BudgetRecommendation[];

  // Savings Goals
  savingsGoals: Array<{
    name: string;
    targetAmount: number;
    currentAmount: number;
    progress: number;
    monthlyContribution: number;
    projectedCompletionDate: string | null;
    onTrack: boolean;
  }>;

  // Cash Flow
  cashFlowPrediction: CashFlowPrediction;
  recurringExpenses: Array<{
    name: string;
    amount: number;
    frequency: "weekly" | "monthly" | "yearly";
    nextDate: string;
  }>;

  // Health Score
  financialHealth: FinancialHealth;

  // Yearly Summary (12 months)
  yearlySummary: YearlySummary;

  // Recent Activity
  recentTransactions: Array<{
    date: string;
    merchant: string;
    amount: number;
    category: string;
    type: "credit" | "debit";
  }>;
}

/**
 * Calculate spending patterns over the last 12 months
 */
async function analyzeSpendingPatterns(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<SpendingPattern[]> {
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  const { data: transactions } = await supabase
    .from("transactions")
    .select("amount, category, transaction_date")
    .eq("user_id", userId)
    .eq("transaction_type", "debit")
    .gte("transaction_date", twelveMonthsAgo.toISOString())
    .order("transaction_date", { ascending: true });

  if (!transactions || transactions.length === 0) return [];

  // Group by category and month
  const categoryMonthly: Record<string, Record<string, number>> = {};

  transactions.forEach(t => {
    const category = t.category || "Other";
    const monthKey = t.transaction_date.substring(0, 7); // YYYY-MM

    if (!categoryMonthly[category]) categoryMonthly[category] = {};
    if (!categoryMonthly[category][monthKey]) categoryMonthly[category][monthKey] = 0;
    categoryMonthly[category][monthKey] += Math.abs(t.amount);
  });

  const now = new Date();
  const thisMonth = now.toISOString().substring(0, 7);
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().substring(0, 7);

  const patterns: SpendingPattern[] = [];

  for (const [category, months] of Object.entries(categoryMonthly)) {
    const monthlyAmounts = Object.values(months);
    const average = monthlyAmounts.reduce((a, b) => a + b, 0) / monthlyAmounts.length;
    const yearlyTotal = monthlyAmounts.reduce((a, b) => a + b, 0);
    const thisMonthAmount = months[thisMonth] || 0;
    const lastMonthAmount = months[lastMonth] || 0;

    // Build monthly breakdown sorted by date
    const monthlyBreakdown = Object.entries(months)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, amount]) => ({ month, amount: Math.round(amount * 1000) / 1000 }));

    let trend: "increasing" | "decreasing" | "stable" = "stable";
    let percentChange = 0;

    if (lastMonthAmount > 0) {
      percentChange = ((thisMonthAmount - lastMonthAmount) / lastMonthAmount) * 100;
      if (percentChange > 15) trend = "increasing";
      else if (percentChange < -15) trend = "decreasing";
    }

    patterns.push({
      category,
      averageMonthly: Math.round(average * 1000) / 1000,
      trend,
      percentChange: Math.round(percentChange),
      lastMonthAmount: Math.round(lastMonthAmount * 1000) / 1000,
      thisMonthAmount: Math.round(thisMonthAmount * 1000) / 1000,
      yearlyTotal: Math.round(yearlyTotal * 1000) / 1000,
      monthlyBreakdown,
    });
  }

  return patterns.sort((a, b) => b.averageMonthly - a.averageMonthly);
}

/**
 * Generate budget recommendations based on spending history
 */
async function generateBudgetRecommendations(
  spendingPatterns: SpendingPattern[],
  monthlyIncome: number
): Promise<BudgetRecommendation[]> {
  const recommendations: BudgetRecommendation[] = [];

  // 50/30/20 rule targets
  const needsTarget = monthlyIncome * 0.5; // 50% for needs
  const wantsTarget = monthlyIncome * 0.3; // 30% for wants

  // Categorize spending categories
  const needsCategories = ["groceries", "utilities", "rent", "healthcare", "insurance", "transport"];
  const wantsCategories = ["dining", "entertainment", "shopping", "subscriptions", "travel"];

  for (const pattern of spendingPatterns.slice(0, 10)) {
    const category = pattern.category.toLowerCase();
    const isNeed = needsCategories.some(n => category.includes(n));

    let recommended: number;
    let reasoning: string;

    if (pattern.trend === "increasing" && pattern.percentChange > 20) {
      // Recommend capping at last month's amount if spending is increasing rapidly
      recommended = pattern.lastMonthAmount;
      reasoning = `Your ${pattern.category} spending increased ${pattern.percentChange}% this month. Setting a cap at last month's level can help control this.`;
    } else if (isNeed) {
      // For necessities, recommend average + 10% buffer
      recommended = pattern.averageMonthly * 1.1;
      reasoning = `Based on your average ${pattern.category} spending with a 10% buffer for flexibility.`;
    } else {
      // For wants, recommend average or less
      recommended = pattern.averageMonthly * 0.9;
      reasoning = `Reducing ${pattern.category} by 10% from your average could help you save more.`;
    }

    recommendations.push({
      category: pattern.category,
      recommendedAmount: Math.round(recommended * 1000) / 1000,
      basedOn: "average",
      reasoning,
      currentSpending: pattern.thisMonthAmount,
    });
  }

  return recommendations;
}

/**
 * Predict cash flow for upcoming periods
 */
async function predictCashFlow(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  currentBalance: number,
  monthlyIncome: number,
  monthlyExpenses: number
): Promise<CashFlowPrediction> {
  // Get recurring transactions (subscriptions, bills) - look back 90 days for better pattern detection
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const { data: recentTransactions } = await supabase
    .from("transactions")
    .select("merchant_name, amount, transaction_date, category, description")
    .eq("user_id", userId)
    .eq("transaction_type", "debit")
    .gte("transaction_date", ninetyDaysAgo.toISOString())
    .order("transaction_date", { ascending: false });

  // Detect recurring bills using multiple strategies:
  // 1. Same merchant with similar amounts
  // 2. Same category with similar amounts (fallback when merchant is null)
  // 3. Similar amounts at regular intervals

  const merchantCounts: Record<string, { count: number; amounts: number[]; dates: string[]; category: string }> = {};
  const categoryCounts: Record<string, { count: number; amounts: number[]; dates: string[] }> = {};
  const amountGroups: Record<string, { count: number; dates: string[]; category: string; description: string }> = {};

  recentTransactions?.forEach(t => {
    const merchant = t.merchant_name;
    const category = t.category || "Other";
    const amount = Math.abs(t.amount);

    // Strategy 1: Group by merchant (only if merchant exists and is not generic)
    if (merchant && merchant !== "Unknown" && merchant.trim() !== "") {
      if (!merchantCounts[merchant]) {
        merchantCounts[merchant] = { count: 0, amounts: [], dates: [], category };
      }
      merchantCounts[merchant].count++;
      merchantCounts[merchant].amounts.push(amount);
      merchantCounts[merchant].dates.push(t.transaction_date);
    }

    // Strategy 2: Group by category for transactions without merchant
    if (!merchant || merchant === "Unknown" || merchant.trim() === "") {
      if (!categoryCounts[category]) {
        categoryCounts[category] = { count: 0, amounts: [], dates: [] };
      }
      categoryCounts[category].count++;
      categoryCounts[category].amounts.push(amount);
      categoryCounts[category].dates.push(t.transaction_date);
    }

    // Strategy 3: Group by rounded amount (for detecting recurring charges)
    // Round to nearest 5 for better grouping
    const roundedAmount = Math.round(amount / 5) * 5;
    const amountKey = `${roundedAmount}`;
    if (!amountGroups[amountKey]) {
      amountGroups[amountKey] = { count: 0, dates: [], category, description: t.description || "" };
    }
    amountGroups[amountKey].count++;
    amountGroups[amountKey].dates.push(t.transaction_date);
  });

  const billsDue: CashFlowPrediction["billsDue"] = [];
  const addedBills = new Set<string>(); // Track added bills to avoid duplicates

  // Process merchant-based recurring expenses
  for (const [merchant, data] of Object.entries(merchantCounts)) {
    if (data.count >= 2 && merchant !== "Unknown") {
      const avgAmount = data.amounts.reduce((a, b) => a + b, 0) / data.amounts.length;
      // Check if amounts are consistent (within 15% for more tolerance)
      const isConsistent = data.amounts.every(a => Math.abs(a - avgAmount) / avgAmount < 0.15);

      if (isConsistent) {
        const lastDate = new Date(data.dates[0]);
        const nextDate = new Date(lastDate);
        nextDate.setMonth(nextDate.getMonth() + 1);

        const billKey = `${merchant}-${Math.round(avgAmount)}`;
        if (!addedBills.has(billKey)) {
          billsDue.push({
            name: merchant,
            amount: Math.round(avgAmount * 1000) / 1000,
            dueDate: nextDate.toISOString().split("T")[0],
            isRecurring: true,
          });
          addedBills.add(billKey);
        }
      }
    }
  }

  // Process category-based recurring expenses (when merchant is missing)
  // Only use categories that typically have recurring expenses
  const recurringCategories = ["subscriptions", "utilities", "insurance", "rent", "bills", "internet", "phone", "gym", "streaming"];

  for (const [category, data] of Object.entries(categoryCounts)) {
    const isRecurringCategory = recurringCategories.some(rc => category.toLowerCase().includes(rc));

    if (data.count >= 2 && isRecurringCategory) {
      const avgAmount = data.amounts.reduce((a, b) => a + b, 0) / data.amounts.length;
      const isConsistent = data.amounts.every(a => Math.abs(a - avgAmount) / avgAmount < 0.15);

      if (isConsistent) {
        const lastDate = new Date(data.dates[0]);
        const nextDate = new Date(lastDate);
        nextDate.setMonth(nextDate.getMonth() + 1);

        const billKey = `${category}-${Math.round(avgAmount)}`;
        if (!addedBills.has(billKey)) {
          billsDue.push({
            name: `${category} (recurring)`,
            amount: Math.round(avgAmount * 1000) / 1000,
            dueDate: nextDate.toISOString().split("T")[0],
            isRecurring: true,
          });
          addedBills.add(billKey);
        }
      }
    }
  }

  // Process amount-based recurring expenses (last resort)
  // Only consider amounts that appear monthly (30 day intervals) and are significant
  for (const [amountKey, data] of Object.entries(amountGroups)) {
    const amount = parseFloat(amountKey);

    // Only consider if: appears 2+ times, amount is significant (> 10 BHD), and we haven't already found this
    if (data.count >= 2 && amount >= 10) {
      // Check if dates are roughly monthly apart (25-35 days)
      const sortedDates = data.dates.map(d => new Date(d)).sort((a, b) => b.getTime() - a.getTime());
      let isMonthlyPattern = false;

      if (sortedDates.length >= 2) {
        const daysBetween = (sortedDates[0].getTime() - sortedDates[1].getTime()) / (1000 * 60 * 60 * 24);
        isMonthlyPattern = daysBetween >= 25 && daysBetween <= 35;
      }

      if (isMonthlyPattern) {
        const billKey = `amount-${amountKey}`;
        if (!addedBills.has(billKey) && billsDue.length < 10) {
          const nextDate = new Date(sortedDates[0]);
          nextDate.setMonth(nextDate.getMonth() + 1);

          billsDue.push({
            name: data.description || `${data.category} expense`,
            amount: amount,
            dueDate: nextDate.toISOString().split("T")[0],
            isRecurring: true,
          });
          addedBills.add(billKey);
        }
      }
    }
  }

  // Calculate projections
  const dailyExpenseRate = monthlyExpenses / 30;
  const weeklyIncome = monthlyIncome / 4;
  const weeklyExpenses = monthlyExpenses / 4;

  const nextWeekProjection = currentBalance + weeklyIncome - weeklyExpenses;
  const nextMonthProjection = currentBalance + monthlyIncome - monthlyExpenses;

  // Check for low balance warning
  let lowBalanceWarning = false;
  let projectedLowDate: string | undefined;

  // If expenses > income, calculate when balance hits critical level
  if (monthlyExpenses > monthlyIncome) {
    const daysUntilCritical = (currentBalance - 500) / dailyExpenseRate; // 500 BHD as critical threshold
    if (daysUntilCritical < 30) {
      lowBalanceWarning = true;
      const criticalDate = new Date();
      criticalDate.setDate(criticalDate.getDate() + Math.floor(daysUntilCritical));
      projectedLowDate = criticalDate.toISOString().split("T")[0];
    }
  }

  return {
    nextWeekProjection: Math.round(nextWeekProjection * 1000) / 1000,
    nextMonthProjection: Math.round(nextMonthProjection * 1000) / 1000,
    billsDue: billsDue.slice(0, 5),
    lowBalanceWarning,
    projectedLowDate,
  };
}

/**
 * Calculate financial health score
 */
function calculateFinancialHealth(
  savingsRate: number,
  budgets: FinanceManagerContext["budgets"],
  totalBalance: number,
  monthlyExpenses: number
): FinancialHealth {
  // Savings Rate Score (0-25 points)
  let savingsRateScore = 0;
  let savingsRateStatus: "good" | "warning" | "critical" = "critical";
  if (savingsRate >= 20) { savingsRateScore = 25; savingsRateStatus = "good"; }
  else if (savingsRate >= 10) { savingsRateScore = 15; savingsRateStatus = "warning"; }
  else if (savingsRate >= 5) { savingsRateScore = 10; savingsRateStatus = "warning"; }
  else if (savingsRate > 0) { savingsRateScore = 5; savingsRateStatus = "critical"; }

  // Budget Adherence Score (0-25 points)
  let budgetScore = 25; // Full score if no budgets (nothing to break)
  let budgetAdherence = 100;
  if (budgets.length > 0) {
    const underBudget = budgets.filter(b => b.percentUsed <= 100).length;
    budgetAdherence = (underBudget / budgets.length) * 100;
    budgetScore = Math.round((budgetAdherence / 100) * 25);
  }
  const budgetStatus: "good" | "warning" | "critical" =
    budgetAdherence >= 80 ? "good" : budgetAdherence >= 50 ? "warning" : "critical";

  // Emergency Fund Score (0-25 points) - months of expenses covered
  const emergencyMonths = monthlyExpenses > 0 ? totalBalance / monthlyExpenses : 0;
  let emergencyScore = 0;
  let emergencyStatus: "good" | "warning" | "critical" = "critical";
  if (emergencyMonths >= 6) { emergencyScore = 25; emergencyStatus = "good"; }
  else if (emergencyMonths >= 3) { emergencyScore = 20; emergencyStatus = "good"; }
  else if (emergencyMonths >= 1) { emergencyScore = 10; emergencyStatus = "warning"; }
  else { emergencyScore = 5; emergencyStatus = "critical"; }

  // Spending Stability Score (0-25 points) - penalize overspending, not underspending
  // Being under budget is good financial behavior, only flag when exceeding budgets
  const volatility = budgets.length > 0
    ? budgets.reduce((sum, b) => sum + Math.max(0, b.percentUsed - 100), 0) / budgets.length
    : 0;
  let stabilityScore = 25;
  let stabilityStatus: "good" | "warning" | "critical" = "good";
  if (volatility > 30) { stabilityScore = 10; stabilityStatus = "critical"; }
  else if (volatility > 15) { stabilityScore = 20; stabilityStatus = "warning"; }

  const totalScore = savingsRateScore + budgetScore + emergencyScore + stabilityScore;

  // Aura Level based on score
  let auraLevel: AuraLevel = "Critical";
  if (totalScore >= 90) auraLevel = "Radiant";      // 90-100: Exceptional financial health
  else if (totalScore >= 75) auraLevel = "Bright";  // 75-89: Strong financial position
  else if (totalScore >= 60) auraLevel = "Steady";  // 60-74: Stable but room for improvement
  else if (totalScore >= 40) auraLevel = "Dim";     // 40-59: Needs attention

  // Generate top recommendation
  let topRecommendation = "";
  if (savingsRateStatus === "critical") {
    topRecommendation = "Focus on increasing your savings rate. Even saving 5% of income is a great start.";
  } else if (emergencyStatus === "critical") {
    topRecommendation = "Build your emergency fund. Aim to save at least 1 month of expenses first.";
  } else if (budgetStatus === "critical") {
    topRecommendation = "Review your budgets - you're exceeding limits in several categories.";
  } else if (savingsRateStatus === "warning") {
    topRecommendation = "Great progress! Try to boost your savings rate to 20% for long-term security.";
  } else {
    topRecommendation = "Excellent financial health! Consider investing your surplus for growth.";
  }

  return {
    score: totalScore,
    auraLevel,
    factors: {
      savingsRate: { score: savingsRateScore, value: savingsRate, status: savingsRateStatus },
      budgetAdherence: { score: budgetScore, value: budgetAdherence, status: budgetStatus },
      emergencyFund: { score: emergencyScore, months: Math.round(emergencyMonths * 10) / 10, status: emergencyStatus },
      spendingStability: { score: stabilityScore, volatility: Math.round(volatility), status: stabilityStatus },
    },
    topRecommendation,
  };
}

/**
 * Calculate yearly summary (12 months of data)
 */
async function calculateYearlySummary(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<YearlySummary> {
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  const { data: transactions } = await supabase
    .from("transactions")
    .select("amount, transaction_type, category, transaction_date")
    .eq("user_id", userId)
    .gte("transaction_date", twelveMonthsAgo.toISOString())
    .order("transaction_date", { ascending: true });

  if (!transactions || transactions.length === 0) {
    return {
      totalIncome: 0,
      totalExpenses: 0,
      totalSaved: 0,
      averageMonthlyIncome: 0,
      averageMonthlyExpenses: 0,
      averageSavingsRate: 0,
      bestSavingsMonth: null,
      worstSpendingMonth: null,
      incomeByMonth: [],
      expensesByMonth: [],
      topCategories: [],
    };
  }

  // Group by month
  const monthlyIncome: Record<string, number> = {};
  const monthlyExpenses: Record<string, number> = {};
  const categoryTotals: Record<string, number> = {};

  transactions.forEach(t => {
    const monthKey = t.transaction_date.substring(0, 7);
    const amount = Math.abs(t.amount);

    if (t.transaction_type === "credit") {
      monthlyIncome[monthKey] = (monthlyIncome[monthKey] || 0) + amount;
    } else {
      monthlyExpenses[monthKey] = (monthlyExpenses[monthKey] || 0) + amount;
      const category = t.category || "Other";
      categoryTotals[category] = (categoryTotals[category] || 0) + amount;
    }
  });

  // Calculate totals
  const totalIncome = Object.values(monthlyIncome).reduce((a, b) => a + b, 0);
  const totalExpenses = Object.values(monthlyExpenses).reduce((a, b) => a + b, 0);
  const totalSaved = totalIncome - totalExpenses;

  // Calculate monthly averages
  const monthsWithData = Math.max(Object.keys(monthlyIncome).length, Object.keys(monthlyExpenses).length, 1);
  const averageMonthlyIncome = totalIncome / monthsWithData;
  const averageMonthlyExpenses = totalExpenses / monthsWithData;
  const averageSavingsRate = averageMonthlyIncome > 0
    ? ((averageMonthlyIncome - averageMonthlyExpenses) / averageMonthlyIncome) * 100
    : 0;

  // Find best savings month
  let bestSavingsMonth: YearlySummary["bestSavingsMonth"] = null;
  let bestSavingsAmount = -Infinity;

  for (const month of Object.keys(monthlyIncome)) {
    const income = monthlyIncome[month] || 0;
    const expenses = monthlyExpenses[month] || 0;
    const saved = income - expenses;
    const rate = income > 0 ? (saved / income) * 100 : 0;

    if (saved > bestSavingsAmount) {
      bestSavingsAmount = saved;
      bestSavingsMonth = {
        month,
        amount: Math.round(saved * 1000) / 1000,
        rate: Math.round(rate * 10) / 10
      };
    }
  }

  // Find worst spending month
  let worstSpendingMonth: YearlySummary["worstSpendingMonth"] = null;
  let worstSpendingAmount = 0;

  for (const [month, amount] of Object.entries(monthlyExpenses)) {
    if (amount > worstSpendingAmount) {
      worstSpendingAmount = amount;
      worstSpendingMonth = { month, amount: Math.round(amount * 1000) / 1000 };
    }
  }

  // Format monthly data arrays
  const incomeByMonth = Object.entries(monthlyIncome)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, amount]) => ({ month, amount: Math.round(amount * 1000) / 1000 }));

  const expensesByMonth = Object.entries(monthlyExpenses)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, amount]) => ({ month, amount: Math.round(amount * 1000) / 1000 }));

  // Top spending categories
  const topCategories = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([category, total]) => ({
      category,
      total: Math.round(total * 1000) / 1000,
      percentage: totalExpenses > 0 ? Math.round((total / totalExpenses) * 100) : 0,
    }));

  return {
    totalIncome: Math.round(totalIncome * 1000) / 1000,
    totalExpenses: Math.round(totalExpenses * 1000) / 1000,
    totalSaved: Math.round(totalSaved * 1000) / 1000,
    averageMonthlyIncome: Math.round(averageMonthlyIncome * 1000) / 1000,
    averageMonthlyExpenses: Math.round(averageMonthlyExpenses * 1000) / 1000,
    averageSavingsRate: Math.round(averageSavingsRate * 10) / 10,
    bestSavingsMonth,
    worstSpendingMonth,
    incomeByMonth,
    expensesByMonth,
    topCategories,
  };
}

/**
 * Detect spending anomalies
 */
async function detectSpendingAnomalies(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<SpendingAnomaly[]> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  // Get recent and historical transactions
  const { data: recentTransactions } = await supabase
    .from("transactions")
    .select("id, merchant_name, amount, category, transaction_date")
    .eq("user_id", userId)
    .eq("transaction_type", "debit")
    .gte("transaction_date", thirtyDaysAgo.toISOString());

  const { data: historicalTransactions } = await supabase
    .from("transactions")
    .select("merchant_name, amount, category")
    .eq("user_id", userId)
    .eq("transaction_type", "debit")
    .gte("transaction_date", ninetyDaysAgo.toISOString())
    .lt("transaction_date", thirtyDaysAgo.toISOString());

  if (!recentTransactions) return [];

  const anomalies: SpendingAnomaly[] = [];

  // Build merchant history
  const merchantHistory: Record<string, number[]> = {};
  historicalTransactions?.forEach(t => {
    const merchant = t.merchant_name || "Unknown";
    if (!merchantHistory[merchant]) merchantHistory[merchant] = [];
    merchantHistory[merchant].push(Math.abs(t.amount));
  });

  // Check recent transactions for anomalies
  for (const t of recentTransactions) {
    const merchant = t.merchant_name || "Unknown";
    const amount = Math.abs(t.amount);

    // Check for unusually high amounts
    if (merchantHistory[merchant] && merchantHistory[merchant].length >= 2) {
      const avg = merchantHistory[merchant].reduce((a, b) => a + b, 0) / merchantHistory[merchant].length;
      if (amount > avg * 2 && amount > 50) { // More than double and over 50 BHD
        anomalies.push({
          transactionId: t.id,
          merchant,
          amount,
          category: t.category || "Other",
          date: t.transaction_date,
          reason: "unusually_high",
          typicalAmount: Math.round(avg * 1000) / 1000,
        });
      }
    }

    // Check for new merchants with high spending
    if (!merchantHistory[merchant] && amount > 200) {
      anomalies.push({
        transactionId: t.id,
        merchant,
        amount,
        category: t.category || "Other",
        date: t.transaction_date,
        reason: "new_merchant",
      });
    }
  }

  return anomalies.slice(0, 5); // Return top 5 anomalies
}

/**
 * Main function to get comprehensive finance manager context
 */
export async function getFinanceManagerContext(userId: string): Promise<FinanceManagerContext | null> {
  const supabase = await createClient();

  // Check if user has bank connections
  const { data: connections } = await supabase
    .from("bank_connections")
    .select("id, status")
    .eq("user_id", userId)
    .eq("status", "active");

  const hasBankConnected = (connections?.length ?? 0) > 0;

  if (!hasBankConnected) {
    return {
      hasBankConnected: false,
      accountCount: 0,
      totalBalance: 0,
      currency: "BHD",
      monthlyIncome: 0,
      monthlyExpenses: 0,
      netCashFlow: 0,
      savingsRate: 0,
      spendingPatterns: [],
      topSpendingCategories: [],
      unusualSpending: [],
      budgets: [],
      budgetRecommendations: [],
      savingsGoals: [],
      cashFlowPrediction: {
        nextWeekProjection: 0,
        nextMonthProjection: 0,
        billsDue: [],
        lowBalanceWarning: false,
      },
      recurringExpenses: [],
      financialHealth: {
        score: 0,
        grade: "F",
        factors: {
          savingsRate: { score: 0, value: 0, status: "critical" },
          budgetAdherence: { score: 0, value: 0, status: "critical" },
          emergencyFund: { score: 0, months: 0, status: "critical" },
          spendingStability: { score: 0, volatility: 0, status: "critical" },
        },
        topRecommendation: "Connect your bank account to get started with personalized financial insights.",
      },
      yearlySummary: {
        totalIncome: 0,
        totalExpenses: 0,
        totalSaved: 0,
        averageMonthlyIncome: 0,
        averageMonthlyExpenses: 0,
        averageSavingsRate: 0,
        bestSavingsMonth: null,
        worstSpendingMonth: null,
        incomeByMonth: [],
        expensesByMonth: [],
        topCategories: [],
      },
      recentTransactions: [],
    };
  }

  // Get accounts
  const { data: accounts } = await supabase
    .from("bank_accounts")
    .select("id, balance, currency, account_name, account_type")
    .eq("user_id", userId);

  const totalBalance = accounts?.reduce((sum, acc) => sum + (acc.balance || 0), 0) || 0;
  const currency = accounts?.[0]?.currency || "BHD";

  // Get transactions for income/expense calculation
  // Use 90 days for both income and expenses to ensure consistent data capture
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  // Get 90-day transactions for analysis
  const { data: quarterTransactions } = await supabase
    .from("transactions")
    .select("amount, transaction_type, category, merchant_name, transaction_date")
    .eq("user_id", userId)
    .gte("transaction_date", ninetyDaysAgo.toISOString())
    .order("transaction_date", { ascending: false });

  // Calculate income from last 90 days and average to monthly
  const quarterIncome = quarterTransactions
    ?.filter(t => t.transaction_type === "credit")
    .reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0;

  // Average quarterly income to get monthly estimate
  const monthlyIncome = Math.round((quarterIncome / 3) * 1000) / 1000;

  // Calculate expenses from last 90 days and average to monthly
  // This ensures expenses aren't missed when transactions are older than 30 days
  const quarterExpenses = quarterTransactions
    ?.filter(t => t.transaction_type === "debit")
    .reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0;

  // Average quarterly expenses to get monthly estimate
  const monthlyExpenses = Math.round((quarterExpenses / 3) * 1000) / 1000;

  // Keep reference to recent transactions for display purposes
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const monthTransactions = quarterTransactions?.filter(t => {
    const txDate = new Date(t.transaction_date);
    return txDate >= thirtyDaysAgo;
  }) || [];

  const netCashFlow = monthlyIncome - monthlyExpenses;
  const savingsRate = monthlyIncome > 0 ? (netCashFlow / monthlyIncome) * 100 : 0;

  // Get spending patterns
  const spendingPatterns = await analyzeSpendingPatterns(supabase, userId);

  // Top spending categories
  const topSpendingCategories = spendingPatterns.slice(0, 5).map(p => ({
    category: p.category,
    amount: p.thisMonthAmount,
    percentage: monthlyExpenses > 0 ? Math.round((p.thisMonthAmount / monthlyExpenses) * 100) : 0,
  }));

  // Get budgets with projections
  const { data: budgetsData } = await supabase
    .from("budgets")
    .select("id, category, amount, start_date, end_date, currency")
    .eq("user_id", userId)
    .eq("is_active", true);

  const budgets = await Promise.all(
    (budgetsData || []).map(async (budget) => {
      const { data: spent } = await supabase.rpc("calculate_budget_spent", {
        p_user_id: userId,
        p_category: budget.category,
        p_start_date: budget.start_date,
        p_end_date: budget.end_date || new Date().toISOString().split("T")[0],
      });

      const spentAmount = spent || 0;
      const remaining = budget.amount - spentAmount;
      const percentUsed = Math.round((spentAmount / budget.amount) * 100);

      // Calculate days remaining in budget period
      const endDate = budget.end_date ? new Date(budget.end_date) : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
      const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

      // Project if will overspend
      const dailySpendRate = spentAmount / (30 - daysRemaining || 1);
      const projectedTotal = spentAmount + (dailySpendRate * daysRemaining);
      const projectedOverspend = projectedTotal > budget.amount;

      return {
        category: budget.category,
        limit: budget.amount,
        spent: Math.round(spentAmount * 1000) / 1000,
        remaining: Math.round(remaining * 1000) / 1000,
        percentUsed,
        daysRemaining,
        projectedOverspend,
      };
    })
  );

  // Get savings goals with projections
  const { data: goalsData } = await supabase
    .from("savings_goals")
    .select("id, goal_name, target_amount, current_amount, target_date, currency")
    .eq("user_id", userId)
    .eq("is_active", true);

  const savingsGoals = (goalsData || []).map(goal => {
    const remaining = goal.target_amount - (goal.current_amount || 0);
    const progress = Math.round(((goal.current_amount || 0) / goal.target_amount) * 100);

    // Calculate monthly contribution needed
    let monthlyContribution = 0;
    let projectedCompletionDate: string | null = null;
    let onTrack = false;

    if (goal.target_date) {
      const targetDate = new Date(goal.target_date);
      const monthsRemaining = Math.max(1, (targetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30));
      monthlyContribution = remaining / monthsRemaining;
      onTrack = savingsRate > 0 && (netCashFlow >= monthlyContribution);
      projectedCompletionDate = goal.target_date;
    } else if (netCashFlow > 0) {
      // Estimate completion if no target date
      const monthsToComplete = remaining / netCashFlow;
      const completionDate = new Date();
      completionDate.setMonth(completionDate.getMonth() + Math.ceil(monthsToComplete));
      projectedCompletionDate = completionDate.toISOString().split("T")[0];
      onTrack = monthsToComplete <= 24; // Consider on track if completable within 2 years
    }

    return {
      name: goal.goal_name,
      targetAmount: goal.target_amount,
      currentAmount: goal.current_amount || 0,
      progress,
      monthlyContribution: Math.round(monthlyContribution * 1000) / 1000,
      projectedCompletionDate,
      onTrack,
    };
  });

  // Generate budget recommendations
  const budgetRecommendations = await generateBudgetRecommendations(spendingPatterns, monthlyIncome);

  // Predict cash flow
  const cashFlowPrediction = await predictCashFlow(supabase, userId, totalBalance, monthlyIncome, monthlyExpenses);

  // Detect anomalies
  const unusualSpending = await detectSpendingAnomalies(supabase, userId);

  // Calculate financial health
  const financialHealth = calculateFinancialHealth(savingsRate, budgets, totalBalance, monthlyExpenses);

  // Calculate yearly summary (12 months of data)
  const yearlySummary = await calculateYearlySummary(supabase, userId);

  // Get recent transactions
  const recentTransactions = (monthTransactions || [])
    .slice(0, 20)
    .map(t => ({
      date: t.transaction_date,
      merchant: t.merchant_name || "Unknown",
      amount: Math.abs(t.amount),
      category: t.category || "Other",
      type: t.transaction_type as "credit" | "debit",
    }));

  return {
    hasBankConnected,
    accountCount: accounts?.length || 0,
    totalBalance: Math.round(totalBalance * 1000) / 1000,
    currency,
    monthlyIncome: Math.round(monthlyIncome * 1000) / 1000,
    monthlyExpenses: Math.round(monthlyExpenses * 1000) / 1000,
    netCashFlow: Math.round(netCashFlow * 1000) / 1000,
    savingsRate: Math.round(savingsRate * 10) / 10,
    spendingPatterns,
    topSpendingCategories,
    unusualSpending,
    budgets,
    budgetRecommendations: budgetRecommendations.slice(0, 5),
    savingsGoals,
    cashFlowPrediction,
    recurringExpenses: cashFlowPrediction.billsDue.map(b => ({
      name: b.name,
      amount: b.amount,
      frequency: "monthly" as const,
      nextDate: b.dueDate,
    })),
    financialHealth,
    yearlySummary,
    recentTransactions,
  };
}

/**
 * Format finance manager context for AI prompt
 */
export function formatFinanceManagerContext(context: FinanceManagerContext): string {
  if (!context.hasBankConnected) {
    return `

USER FINANCIAL CONTEXT:
- Bank Connected: No
- Status: User needs to connect their bank account first

RECOMMENDATION: Suggest connecting a bank account to access personalized financial insights and management features.

---END OF USER DATA---
IMPORTANT: No financial data available. Do not make up any numbers or financial information.`;
  }

  let prompt = `

USER FINANCIAL CONTEXT (Enhanced Finance Assistant Data):

=== ACCOUNT OVERVIEW ===
- Total Balance: ${context.totalBalance.toFixed(3)} ${context.currency}
- Number of Accounts: ${context.accountCount}

=== MONTHLY CASH FLOW (Last 30 Days) ===
- Income: ${context.monthlyIncome.toFixed(3)} ${context.currency}
- Expenses: ${context.monthlyExpenses.toFixed(3)} ${context.currency}
- Net Cash Flow: ${context.netCashFlow.toFixed(3)} ${context.currency}
- Savings Rate: ${context.savingsRate}%

=== AURA SCORE (Financial Health) ===
- Aura Score: ${context.financialHealth.score}/100 (Level: ${context.financialHealth.auraLevel})
- Savings Rate Factor: ${context.financialHealth.factors.savingsRate.status.toUpperCase()} (${context.financialHealth.factors.savingsRate.value}%)
- Budget Adherence: ${context.financialHealth.factors.budgetAdherence.status.toUpperCase()} (${context.financialHealth.factors.budgetAdherence.value}% within budget)
- Emergency Fund: ${context.financialHealth.factors.emergencyFund.status.toUpperCase()} (${context.financialHealth.factors.emergencyFund.months} months covered)
- Top Recommendation: ${context.financialHealth.topRecommendation}
`;

  // Budgets section
  if (context.budgets.length > 0) {
    prompt += `
=== ACTIVE BUDGETS (${context.budgets.length}) ===`;
    context.budgets.forEach(b => {
      const status = b.percentUsed > 100 ? "OVER BUDGET" : b.percentUsed > 80 ? "NEAR LIMIT" : "ON TRACK";
      prompt += `
- ${b.category}: ${b.spent.toFixed(3)}/${b.limit.toFixed(3)} ${context.currency} (${b.percentUsed}% used, ${b.daysRemaining} days left) - ${status}${b.projectedOverspend ? " [PROJECTED TO EXCEED]" : ""}`;
    });
  } else {
    prompt += `
=== ACTIVE BUDGETS ===
None set up. User has not created any budgets yet.`;
  }

  // Budget recommendations
  if (context.budgetRecommendations.length > 0) {
    prompt += `

=== BUDGET RECOMMENDATIONS ===`;
    context.budgetRecommendations.slice(0, 3).forEach(r => {
      prompt += `
- ${r.category}: Recommend ${r.recommendedAmount.toFixed(3)} ${context.currency}/month (${r.reasoning})`;
    });
  }

  // Savings goals section
  if (context.savingsGoals.length > 0) {
    prompt += `

=== SAVINGS GOALS (${context.savingsGoals.length}) ===`;
    context.savingsGoals.forEach(g => {
      const status = g.onTrack ? "ON TRACK" : "NEEDS ATTENTION";
      prompt += `
- ${g.name}: ${g.currentAmount.toFixed(3)}/${g.targetAmount.toFixed(3)} ${context.currency} (${g.progress}% complete) - ${status}`;
      if (g.projectedCompletionDate) {
        prompt += ` | Projected: ${g.projectedCompletionDate}`;
      }
      if (g.monthlyContribution > 0) {
        prompt += ` | Needs: ${g.monthlyContribution.toFixed(3)} ${context.currency}/month`;
      }
    });
  } else {
    prompt += `

=== SAVINGS GOALS ===
None set up. User has not created any savings goals yet.`;
  }

  // Top spending categories
  if (context.topSpendingCategories.length > 0) {
    prompt += `

=== TOP SPENDING CATEGORIES (This Month) ===`;
    context.topSpendingCategories.forEach(c => {
      prompt += `
- ${c.category}: ${c.amount.toFixed(3)} ${context.currency} (${c.percentage}% of expenses)`;
    });
  }

  // Spending Insights - Comparative Analysis
  const significantChanges = context.spendingPatterns.filter(p =>
    Math.abs(p.percentChange) > 15 && p.lastMonthAmount > 0
  );

  if (significantChanges.length > 0) {
    prompt += `

=== SPENDING INSIGHTS (Month-over-Month Comparison) ===`;

    // Sort by absolute change to show most significant first
    significantChanges
      .sort((a, b) => Math.abs(b.percentChange) - Math.abs(a.percentChange))
      .forEach(p => {
        const direction = p.trend === "increasing" ? "UP" : p.trend === "decreasing" ? "DOWN" : "STABLE";
        const emoji = p.trend === "increasing" ? "⬆️" : p.trend === "decreasing" ? "⬇️" : "➡️";
        const changeAbs = Math.abs(p.thisMonthAmount - p.lastMonthAmount);
        prompt += `
- ${p.category}: ${emoji} ${direction} ${Math.abs(p.percentChange)}% (${p.lastMonthAmount.toFixed(3)} → ${p.thisMonthAmount.toFixed(3)} ${context.currency}, ${p.trend === "increasing" ? "+" : "-"}${changeAbs.toFixed(3)} ${context.currency})`;
      });

    // Add context about average
    const categoriesAboveAverage = context.spendingPatterns.filter(p =>
      p.thisMonthAmount > p.averageMonthly * 1.2 && p.thisMonthAmount > 0
    );
    if (categoriesAboveAverage.length > 0) {
      prompt += `

Categories above your typical average:`;
      categoriesAboveAverage.slice(0, 3).forEach(p => {
        const aboveAvgPercent = Math.round(((p.thisMonthAmount - p.averageMonthly) / p.averageMonthly) * 100);
        prompt += `
- ${p.category}: ${aboveAvgPercent}% above your ${p.averageMonthly.toFixed(3)} ${context.currency} monthly average`;
      });
    }
  }

  // Budget Proximity Warnings - proactive alerts
  const budgetsNearLimit = context.budgets.filter(b => b.percentUsed >= 70 && b.percentUsed < 100);
  const budgetsOverLimit = context.budgets.filter(b => b.percentUsed >= 100);

  if (budgetsNearLimit.length > 0 || budgetsOverLimit.length > 0) {
    prompt += `

=== BUDGET WARNINGS (Proactive Alerts) ===`;

    budgetsOverLimit.forEach(b => {
      const overAmount = b.spent - b.limit;
      prompt += `
- 🚨 ${b.category}: OVER BUDGET by ${overAmount.toFixed(3)} ${context.currency} (${b.percentUsed}% used)`;
    });

    budgetsNearLimit.forEach(b => {
      prompt += `
- ⚠️ ${b.category}: ${b.percentUsed}% used (${b.remaining.toFixed(3)} ${context.currency} remaining, ${b.daysRemaining} days left)`;
    });

    // Add projection warning
    const projectedToExceed = context.budgets.filter(b => b.projectedOverspend && b.percentUsed < 100);
    if (projectedToExceed.length > 0) {
      prompt += `

Projected to exceed by month end:`;
      projectedToExceed.forEach(b => {
        prompt += `
- ${b.category}: Currently at ${b.percentUsed}% but trending to overspend`;
      });
    }
  }

  // Unusual spending
  if (context.unusualSpending.length > 0) {
    prompt += `

=== UNUSUAL TRANSACTIONS DETECTED ===`;
    context.unusualSpending.forEach(a => {
      const reason = a.reason === "unusually_high"
        ? `usually ${a.typicalAmount?.toFixed(3)} ${context.currency}`
        : a.reason === "new_merchant"
        ? "first time at this merchant"
        : "flagged for review";
      prompt += `
- ${a.date}: ${a.amount.toFixed(3)} ${context.currency} at ${a.merchant} (${reason})`;
    });
  }

  // Cash flow prediction
  if (context.cashFlowPrediction.lowBalanceWarning) {
    prompt += `

=== CASH FLOW WARNING ===
- Projected low balance date: ${context.cashFlowPrediction.projectedLowDate}
- Recommendation: Review expenses or increase income to avoid shortfall`;
  }

  // Upcoming bills
  if (context.cashFlowPrediction.billsDue.length > 0) {
    prompt += `

=== UPCOMING RECURRING EXPENSES ===`;
    context.cashFlowPrediction.billsDue.forEach(b => {
      prompt += `
- ${b.name}: ${b.amount.toFixed(3)} ${context.currency} (due: ${b.dueDate})`;
    });
  }

  // Yearly Summary (12 months)
  if (context.yearlySummary.totalIncome > 0 || context.yearlySummary.totalExpenses > 0) {
    prompt += `

=== YEARLY SUMMARY (Last 12 Months) ===
- Total Income: ${context.yearlySummary.totalIncome.toFixed(3)} ${context.currency}
- Total Expenses: ${context.yearlySummary.totalExpenses.toFixed(3)} ${context.currency}
- Total Saved: ${context.yearlySummary.totalSaved.toFixed(3)} ${context.currency}
- Average Monthly Income: ${context.yearlySummary.averageMonthlyIncome.toFixed(3)} ${context.currency}
- Average Monthly Expenses: ${context.yearlySummary.averageMonthlyExpenses.toFixed(3)} ${context.currency}
- Average Savings Rate: ${context.yearlySummary.averageSavingsRate}%`;

    if (context.yearlySummary.bestSavingsMonth) {
      prompt += `
- Best Savings Month: ${context.yearlySummary.bestSavingsMonth.month} (saved ${context.yearlySummary.bestSavingsMonth.amount.toFixed(3)} ${context.currency}, ${context.yearlySummary.bestSavingsMonth.rate}% rate)`;
    }

    if (context.yearlySummary.worstSpendingMonth) {
      prompt += `
- Highest Spending Month: ${context.yearlySummary.worstSpendingMonth.month} (spent ${context.yearlySummary.worstSpendingMonth.amount.toFixed(3)} ${context.currency})`;
    }

    // Monthly breakdown
    if (context.yearlySummary.incomeByMonth.length > 0) {
      prompt += `

=== MONTHLY INCOME BREAKDOWN (12 Months) ===`;
      context.yearlySummary.incomeByMonth.forEach(m => {
        prompt += `
- ${m.month}: ${m.amount.toFixed(3)} ${context.currency}`;
      });
    }

    if (context.yearlySummary.expensesByMonth.length > 0) {
      prompt += `

=== MONTHLY EXPENSES BREAKDOWN (12 Months) ===`;
      context.yearlySummary.expensesByMonth.forEach(m => {
        prompt += `
- ${m.month}: ${m.amount.toFixed(3)} ${context.currency}`;
      });
    }

    // Top categories for the year
    if (context.yearlySummary.topCategories.length > 0) {
      prompt += `

=== TOP YEARLY SPENDING CATEGORIES ===`;
      context.yearlySummary.topCategories.forEach(c => {
        prompt += `
- ${c.category}: ${c.total.toFixed(3)} ${context.currency} (${c.percentage}% of yearly expenses)`;
      });
    }
  }

  // Recent transactions sample
  if (context.recentTransactions.length > 0) {
    prompt += `

=== RECENT TRANSACTIONS (Last 10) ===`;
    context.recentTransactions.slice(0, 10).forEach(t => {
      const sign = t.type === "credit" ? "+" : "-";
      prompt += `
- ${t.date}: ${sign}${t.amount.toFixed(3)} ${context.currency} at ${t.merchant} (${t.category})`;
    });
  }

  prompt += `

---END OF USER DATA---
IMPORTANT: The data above is COMPLETE. Only reference information explicitly shown above. If a budget, goal, or category is not listed, it does NOT exist - do not invent or assume any data.`;

  return prompt;
}
