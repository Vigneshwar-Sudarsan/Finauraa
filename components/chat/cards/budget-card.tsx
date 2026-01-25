"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn, formatCurrency } from "@/lib/utils";

interface BudgetCardProps {
  data?: Record<string, unknown>;
  onAction?: (action: string, data?: Record<string, unknown>) => void;
  disabled?: boolean;
}

// Minimal neutral category labels
const CATEGORY_LABELS: Record<string, string> = {
  groceries: "Groceries",
  dining: "Dining",
  transport: "Transport",
  shopping: "Shopping",
  bills: "Bills",
  entertainment: "Entertainment",
  health: "Health",
  coffee: "Coffee",
  fuel: "Fuel",
  other: "Other",
};

export function BudgetCard({ data, onAction, disabled }: BudgetCardProps) {
  const category = (data?.category as string) ?? "other";
  const spent = (data?.spent as number) ?? 0;
  const limit = (data?.limit as number) ?? 0;
  const currency = (data?.currency as string) ?? "BHD";
  const month = (data?.month as string) ?? "January";
  const isSetup = (data?.isSetup as boolean) ?? false;
  const suggestedAmount = (data?.suggestedAmount as number) ?? 0;

  const label = CATEGORY_LABELS[category.toLowerCase()] ?? category;

  // If it's a setup card (interactive) and not disabled
  if (isSetup && !disabled) {
    return (
      <BudgetSetupCard
        category={category}
        label={label}
        currency={currency}
        suggestedAmount={suggestedAmount}
        onSubmit={(amount) => onAction?.("set-budget", { category, amount, currency })}
        onCancel={() => onAction?.("cancel-budget")}
      />
    );
  }

  // If disabled and was a setup card, show completed state
  if (isSetup && disabled) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span>Budget set</span>
      </div>
    );
  }

  // Display mode - show existing budget
  const percentage = limit > 0 ? Math.round((spent / limit) * 100) : 0;
  const remaining = Math.max(limit - spent, 0);
  const isOverBudget = spent > limit;

  return (
    <div className="w-full max-w-sm rounded-xl border border-border bg-card p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">{month}</p>
        </div>
      </div>

      {/* Amount */}
      <div>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-semibold">{formatCurrency(spent)}</span>
          <span className="text-sm text-muted-foreground">
            / {formatCurrency(limit)}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-foreground/60 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{percentage}% used</span>
          <span>
            {isOverBudget
              ? `${formatCurrency(spent - limit)} over`
              : `${formatCurrency(remaining)} remaining`}
          </span>
        </div>
      </div>
    </div>
  );
}

// Interactive budget setup component
interface BudgetSetupCardProps {
  category: string;
  label: string;
  currency: string;
  suggestedAmount: number;
  onSubmit: (amount: number) => void;
  onCancel: () => void;
}

function BudgetSetupCard({
  label,
  currency,
  suggestedAmount,
  onSubmit,
  onCancel,
}: BudgetSetupCardProps) {
  const [amount, setAmount] = useState(suggestedAmount > 0 ? suggestedAmount.toString() : "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const presetAmounts = [50, 100, 150, 200, 300];

  const handleSubmit = () => {
    const numAmount = parseFloat(amount);
    if (numAmount > 0) {
      setIsSubmitting(true);
      onSubmit(numAmount);
    }
  };

  return (
    <div className="w-full max-w-sm rounded-xl border border-border bg-card p-4 space-y-4">
      {/* Header */}
      <div>
        <p className="font-medium">Set {label} Budget</p>
        <p className="text-xs text-muted-foreground">Monthly spending limit</p>
      </div>

      {/* Amount input */}
      <div className="space-y-3">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            {currency}
          </span>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.000"
            className={cn(
              "w-full h-12 pl-12 pr-4 text-xl font-semibold rounded-lg border border-border bg-background",
              "placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/20"
            )}
          />
        </div>

        {/* Quick amount buttons */}
        <div className="flex flex-wrap gap-2">
          {presetAmounts.map((preset) => (
            <button
              key={preset}
              onClick={() => setAmount(preset.toString())}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-full border transition-colors",
                amount === preset.toString()
                  ? "bg-foreground text-background border-foreground"
                  : "border-border hover:bg-muted"
              )}
            >
              {formatCurrency(preset)}
            </button>
          ))}
        </div>

        {/* Suggestion */}
        {suggestedAmount > 0 && (
          <p className="text-xs text-muted-foreground">
            Based on your spending, we suggest{" "}
            <button
              onClick={() => setAmount(suggestedAmount.toString())}
              className="text-foreground font-medium hover:underline"
            >
              {formatCurrency(suggestedAmount)}
            </button>
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <Button
          variant="outline"
          size="sm"
          onClick={onCancel}
          className="flex-1 rounded-full"
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={handleSubmit}
          className="flex-1 rounded-full"
          disabled={!amount || parseFloat(amount) <= 0 || isSubmitting}
        >
          {isSubmitting ? "Setting..." : "Set Budget"}
        </Button>
      </div>
    </div>
  );
}
