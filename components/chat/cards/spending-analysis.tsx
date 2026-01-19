"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Check } from "@phosphor-icons/react";

interface SpendingAnalysisProps {
  data?: Record<string, unknown>;
  onAction?: (action: string, data?: Record<string, unknown>) => void;
  disabled?: boolean;
}

interface CategorySpending {
  category: string;
  amount: number;
  percentage: number;
}

interface SpendingData {
  totalSpent: number;
  currency: string;
  period: string;
  categories: CategorySpending[];
  topCategory: string | null;
}

// Minimal neutral category config
const CATEGORY_LABELS: Record<string, string> = {
  groceries: "Groceries",
  dining: "Dining",
  transport: "Transport",
  shopping: "Shopping",
  bills: "Bills",
  entertainment: "Entertainment",
  health: "Health",
  other: "Other",
};

export function SpendingAnalysis({ data, onAction, disabled }: SpendingAnalysisProps) {
  const [spending, setSpending] = useState<SpendingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/finance/spending?days=90");
        if (response.ok) {
          const result = await response.json();
          setSpending({
            totalSpent: result.totalSpent ?? 0,
            currency: result.currency ?? "BHD",
            period: result.period ?? "Last 90 days",
            categories: result.categories ?? [],
            topCategory: result.topCategory,
          });
        }
      } catch (error) {
        console.error("Failed to fetch spending:", error);
      } finally {
        setIsLoading(false);
      }
    };

    // Use passed data if available, otherwise fetch
    if (data?.totalSpent !== undefined) {
      setSpending({
        totalSpent: data.totalSpent as number,
        currency: (data.currency as string) ?? "BHD",
        period: (data.period as string) ?? "Last 90 days",
        categories: (data.categories as CategorySpending[]) ?? [],
        topCategory: (data.topCategory as string) ?? null,
      });
      setIsLoading(false);
    } else {
      fetchData();
    }
  }, [data]);

  const totalSpent = spending?.totalSpent ?? 0;
  const currency = spending?.currency ?? "BHD";
  const period = spending?.period ?? "Last 90 days";
  const categories = spending?.categories ?? [];
  const topCategory = spending?.topCategory ?? "";

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-BH", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const maxAmount = Math.max(...categories.map((c) => c.amount), 1);

  if (isLoading) {
    return (
      <div className="w-full max-w-sm rounded-xl border border-border/60 bg-card p-4 space-y-3">
        <div className="space-y-2">
          <div className="h-3 w-20 bg-muted rounded animate-pulse" />
          <div className="h-6 w-28 bg-muted rounded animate-pulse" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-1.5">
              <div className="flex justify-between">
                <div className="h-3 w-16 bg-muted rounded animate-pulse" />
                <div className="h-3 w-12 bg-muted rounded animate-pulse" />
              </div>
              <div className="h-1.5 bg-muted rounded-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="w-full max-w-sm rounded-xl border border-border/60 bg-card p-4">
        <p className="text-sm text-muted-foreground">
          No spending data available yet. Transactions will appear here once synced from your bank.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm rounded-xl border border-border/60 bg-card p-4 space-y-3">
      {/* Header */}
      <div>
        <p className="text-xs text-muted-foreground">{period}</p>
        <p className="text-lg font-semibold">
          Total: {formatCurrency(totalSpent)}
        </p>
      </div>

      {/* Category bars */}
      <div className="space-y-3">
        {categories.slice(0, 6).map((cat) => {
          const label = CATEGORY_LABELS[cat.category.toLowerCase()] ?? cat.category;
          const barWidth = (cat.amount / maxAmount) * 100;

          return (
            <div key={cat.category} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium">{formatCurrency(cat.amount)}</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-foreground/50 rounded-full transition-all duration-500"
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Insight */}
      {topCategory && (
        <p className="text-xs text-muted-foreground pt-2 border-t border-border/40">
          Your biggest category is{" "}
          <span className="font-medium text-foreground">{topCategory}</span>.
          Want me to set up a budget for it?
        </p>
      )}

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
            onClick={() => onAction?.("set-budget", { category: topCategory })}
            className="flex-1 rounded-full"
          >
            Set budget
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAction?.("show-transactions")}
            className="flex-1 rounded-full"
          >
            Show transactions
          </Button>
        </div>
      )}
    </div>
  );
}
