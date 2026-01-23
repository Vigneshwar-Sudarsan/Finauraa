"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Check, Wallet, Warning, Plus } from "@phosphor-icons/react";

interface BudgetOverviewProps {
  data?: Record<string, unknown>;
  onAction?: (action: string, data?: Record<string, unknown>) => void;
  disabled?: boolean;
}

interface Budget {
  id: string;
  category: string;
  limit: number;
  spent: number;
  remaining: number;
  percentUsed: number;
  daysRemaining: number;
  projectedOverspend: boolean;
  currency: string;
}

interface BudgetOverviewData {
  budgets: Budget[];
  totalBudgeted: number;
  totalSpent: number;
  currency: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  groceries: "Groceries",
  dining: "Dining",
  transport: "Transport",
  shopping: "Shopping",
  bills: "Bills & Utilities",
  entertainment: "Entertainment",
  health: "Health",
  education: "Education",
  travel: "Travel",
  subscriptions: "Subscriptions",
  other: "Other",
};

export function BudgetOverview({ data, onAction, disabled }: BudgetOverviewProps) {
  const [budgetData, setBudgetData] = useState<BudgetOverviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/finance/budgets");
        if (response.ok) {
          const result = await response.json();

          // Calculate days remaining in month
          const now = new Date();
          const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          const daysRemaining = Math.ceil((endOfMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

          // Transform API response to expected format
          const budgets = (result.budgets || []).map((b: {
            id: string;
            category: string;
            amount: number;
            spent: number;
            remaining: number;
            percentage: number;
            currency?: string;
          }) => ({
            id: b.id,
            category: b.category,
            limit: b.amount,
            spent: b.spent || 0,
            remaining: b.remaining || Math.max(0, b.amount - (b.spent || 0)),
            percentUsed: b.percentage || Math.round(((b.spent || 0) / b.amount) * 100),
            daysRemaining: daysRemaining,
            projectedOverspend: false,
            currency: b.currency || "BHD",
          }));

          // Calculate totals
          const totalBudgeted = budgets.reduce((sum: number, b: Budget) => sum + b.limit, 0);
          const totalSpent = budgets.reduce((sum: number, b: Budget) => sum + b.spent, 0);

          setBudgetData({
            budgets,
            totalBudgeted,
            totalSpent,
            currency: budgets[0]?.currency || "BHD",
          });
        }
      } catch (error) {
        console.error("Failed to fetch budgets:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (data?.budgets !== undefined) {
      setBudgetData(data as unknown as BudgetOverviewData);
      setIsLoading(false);
    } else {
      fetchData();
    }
  }, [data]);

  const formatCurrency = (amount: number) => {
    const currency = budgetData?.currency ?? "BHD";
    return new Intl.NumberFormat("en-BH", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: currency === "BHD" ? 3 : 0,
      maximumFractionDigits: currency === "BHD" ? 3 : 0,
    }).format(amount);
  };

  const getStatusColor = (percentUsed: number, projectedOverspend: boolean) => {
    if (percentUsed > 100) return "text-red-600 dark:text-red-400";
    if (percentUsed > 80 || projectedOverspend) return "text-yellow-600 dark:text-yellow-400";
    return "text-green-600 dark:text-green-400";
  };

  const getProgressColor = (percentUsed: number, projectedOverspend: boolean) => {
    if (percentUsed > 100) return "bg-red-500";
    if (percentUsed > 80 || projectedOverspend) return "bg-yellow-500";
    return "bg-green-500";
  };

  if (isLoading) {
    return (
      <div className="w-full max-w-sm rounded-xl border border-border/60 bg-card p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-5 w-24 bg-muted rounded animate-pulse" />
          <div className="h-5 w-20 bg-muted rounded animate-pulse" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-3 rounded-lg border border-border/40 space-y-2">
              <div className="flex items-center justify-between">
                <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                <div className="h-4 w-16 bg-muted rounded animate-pulse" />
              </div>
              <div className="h-2 bg-muted rounded-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!budgetData || budgetData.budgets.length === 0) {
    return (
      <div className="w-full max-w-sm rounded-xl border border-border/60 bg-card p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-muted-foreground" weight="duotone" />
          <p className="font-medium">Budget Overview</p>
        </div>
        <p className="text-sm text-muted-foreground">
          You haven&apos;t set up any budgets yet. Budgets help you control spending and reach your savings goals faster.
        </p>
        {!disabled && (
          <Button
            size="sm"
            onClick={() => onAction?.("create-budget", { category: "groceries", suggestedAmount: 200 })}
            className="w-full rounded-full"
          >
            <Plus className="h-4 w-4 mr-1.5" weight="bold" />
            Create Your First Budget
          </Button>
        )}
      </div>
    );
  }

  const overallPercentUsed = budgetData.totalBudgeted > 0
    ? Math.round((budgetData.totalSpent / budgetData.totalBudgeted) * 100)
    : 0;
  const overBudgetCount = budgetData.budgets.filter(b => b.percentUsed > 100).length;
  const atRiskCount = budgetData.budgets.filter(b => b.projectedOverspend && b.percentUsed <= 100).length;

  return (
    <div className="w-full max-w-sm rounded-xl border border-border/60 bg-card p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary" weight="duotone" />
          <p className="font-medium">Budget Overview</p>
        </div>
        <span className={`text-sm font-semibold ${getStatusColor(overallPercentUsed, false)}`}>
          {overallPercentUsed}% used
        </span>
      </div>

      {/* Total Summary */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Total spent</span>
          <span>{formatCurrency(budgetData.totalSpent)} / {formatCurrency(budgetData.totalBudgeted)}</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${getProgressColor(overallPercentUsed, false)}`}
            style={{ width: `${Math.min(overallPercentUsed, 100)}%` }}
          />
        </div>
      </div>

      {/* Warnings */}
      {(overBudgetCount > 0 || atRiskCount > 0) && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
          <Warning className="h-4 w-4 text-yellow-600 dark:text-yellow-400" weight="bold" />
          <span className="text-xs text-yellow-700 dark:text-yellow-300">
            {overBudgetCount > 0 && `${overBudgetCount} over budget`}
            {overBudgetCount > 0 && atRiskCount > 0 && ", "}
            {atRiskCount > 0 && `${atRiskCount} at risk`}
          </span>
        </div>
      )}

      {/* Budget List */}
      <div className="space-y-2">
        {budgetData.budgets.slice(0, 5).map((budget) => {
          const label = CATEGORY_LABELS[budget.category.toLowerCase()] ?? budget.category;
          const statusColor = getStatusColor(budget.percentUsed, budget.projectedOverspend);
          const progressColor = getProgressColor(budget.percentUsed, budget.projectedOverspend);

          return (
            <div key={budget.id} className="p-2.5 rounded-lg border border-border/40 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{label}</span>
                <div className="flex items-center gap-1.5">
                  {budget.projectedOverspend && budget.percentUsed <= 100 && (
                    <Warning className="h-3.5 w-3.5 text-yellow-600 dark:text-yellow-400" weight="bold" />
                  )}
                  <span className={`text-xs font-semibold ${statusColor}`}>
                    {budget.percentUsed}%
                  </span>
                </div>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
                  style={{ width: `${Math.min(budget.percentUsed, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{formatCurrency(budget.spent)} spent</span>
                <span>{formatCurrency(budget.remaining)} left • {budget.daysRemaining} days</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      {disabled ? (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Check size={14} weight="bold" />
          <span>Action completed</span>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => onAction?.("create-budget")}
            className="flex-1 rounded-full"
          >
            <Plus className="h-4 w-4 mr-1" weight="bold" />
            Add Budget
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAction?.("analyze-spending")}
            className="flex-1 rounded-full"
          >
            Spending
          </Button>
        </div>
      )}
    </div>
  );
}
