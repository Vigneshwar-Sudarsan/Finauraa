"use client";

import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

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
  const totalSpent = (data?.totalSpent as number) ?? 0;
  const currency = (data?.currency as string) ?? "BHD";
  const period = (data?.period as string) ?? "Last 90 days";
  const categories = (data?.categories as CategorySpending[]) ?? [];
  const topCategory = (data?.topCategory as string) ?? "";

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-BH", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const maxAmount = Math.max(...categories.map((c) => c.amount));

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
          <Check className="size-3.5" />
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
