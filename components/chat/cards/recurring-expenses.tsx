"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Check, Repeat, Calendar } from "@phosphor-icons/react";

interface RecurringExpensesProps {
  data?: Record<string, unknown>;
  onAction?: (action: string, data?: Record<string, unknown>) => void;
  disabled?: boolean;
}

interface RecurringExpense {
  id: string;
  name: string;
  amount: number;
  frequency: "weekly" | "monthly" | "yearly";
  nextDate: string;
  category: string;
}

interface RecurringExpensesData {
  expenses: RecurringExpense[];
  monthlyTotal: number;
  currency: string;
}

const FREQUENCY_LABELS: Record<string, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
};

export function RecurringExpenses({ data, onAction, disabled }: RecurringExpensesProps) {
  const [expensesData, setExpensesData] = useState<RecurringExpensesData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/finance/recurring");
        if (response.ok) {
          const result = await response.json();
          setExpensesData(result);
        }
      } catch (error) {
        console.error("Failed to fetch recurring expenses:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (data?.expenses !== undefined) {
      setExpensesData(data as unknown as RecurringExpensesData);
      setIsLoading(false);
    } else {
      fetchData();
    }
  }, [data]);

  const formatCurrency = (amount: number) => {
    const currency = expensesData?.currency ?? "BHD";
    return new Intl.NumberFormat("en-BH", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: currency === "BHD" ? 3 : 2,
      maximumFractionDigits: currency === "BHD" ? 3 : 2,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const diffDays = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    if (diffDays < 7) return `In ${diffDays} days`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const getDaysUntil = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    return Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  if (isLoading) {
    return (
      <div className="w-full max-w-sm rounded-xl border border-border/60 bg-card p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-5 w-32 bg-muted rounded animate-pulse" />
          <div className="h-5 w-20 bg-muted rounded animate-pulse" />
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between p-2.5 rounded-lg border border-border/40">
              <div className="space-y-1">
                <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                <div className="h-3 w-16 bg-muted rounded animate-pulse" />
              </div>
              <div className="h-4 w-16 bg-muted rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!expensesData || expensesData.expenses.length === 0) {
    return (
      <div className="w-full max-w-sm rounded-xl border border-border/60 bg-card p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Repeat className="h-5 w-5 text-muted-foreground" weight="duotone" />
          <p className="font-medium">Recurring Expenses</p>
        </div>
        <p className="text-sm text-muted-foreground">
          No recurring expenses detected yet. Recurring expenses are identified when you have 2 or more similar transactions (subscriptions, bills, etc.) over the past 3 months.
        </p>
        <p className="text-xs text-muted-foreground/70">
          Keep using your connected accounts and I&apos;ll automatically detect recurring patterns.
        </p>
        {!disabled && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAction?.("show-transactions")}
            className="w-full rounded-full"
          >
            View Transactions
          </Button>
        )}
      </div>
    );
  }

  // Sort by next due date
  const sortedExpenses = [...expensesData.expenses].sort((a, b) => {
    return getDaysUntil(a.nextDate) - getDaysUntil(b.nextDate);
  });

  return (
    <div className="w-full max-w-sm rounded-xl border border-border/60 bg-card p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Repeat className="h-5 w-5 text-primary" weight="duotone" />
          <p className="font-medium">Recurring Expenses</p>
        </div>
        <span className="text-sm text-muted-foreground">
          {formatCurrency(expensesData.monthlyTotal)}/mo
        </span>
      </div>

      {/* Expense List */}
      <div className="space-y-2">
        {sortedExpenses.slice(0, 6).map((expense) => {
          const daysUntil = getDaysUntil(expense.nextDate);
          const isUpcoming = daysUntil <= 7;

          return (
            <div
              key={expense.id}
              className={`flex items-center justify-between p-2.5 rounded-lg border transition-colors ${
                isUpcoming
                  ? "border-yellow-500/30 bg-yellow-500/5"
                  : "border-border/40"
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{expense.name}</p>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>{formatDate(expense.nextDate)}</span>
                  <span>•</span>
                  <span>{FREQUENCY_LABELS[expense.frequency]}</span>
                </div>
              </div>
              <div className="text-right pl-2">
                <p className={`text-sm font-semibold ${isUpcoming ? "text-yellow-600 dark:text-yellow-400" : ""}`}>
                  {formatCurrency(expense.amount)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="pt-2 border-t border-border/40">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Total this month</span>
          <span className="font-semibold">{formatCurrency(expensesData.monthlyTotal)}</span>
        </div>
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
            onClick={() => onAction?.("show-cash-flow")}
            className="flex-1 rounded-full"
          >
            Cash Flow
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAction?.("create-budget", { category: "subscriptions", suggestedAmount: expensesData.monthlyTotal })}
            className="flex-1 rounded-full"
          >
            Set Budget
          </Button>
        </div>
      )}
    </div>
  );
}
