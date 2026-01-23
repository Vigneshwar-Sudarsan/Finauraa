"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import {
  ShoppingCart,
  Car,
  Hamburger,
  Lightning,
  CreditCard,
  House,
  Heartbeat,
  GameController,
  Airplane,
  DotsThree,
  Plus,
  Gauge,
  Users,
  CaretRight,
  Warning,
  CheckCircle,
} from "@phosphor-icons/react";
import { useCategories } from "@/hooks/use-categories";

interface Budget {
  id: string;
  category: string;
  amount: number;
  currency: string;
  period: string;
  spent: number;
  remaining: number;
  percentage: number;
}

interface SpendingLimitsSectionProps {
  budgets: Budget[];
  currency?: string;
  isLoading?: boolean;
  variant?: "personal" | "family";
  onAddLimit: () => void;
  onEditLimit: (budget: Budget) => void;
}

// Category icons mapping
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const categoryIcons: Record<string, React.ComponentType<any>> = {
  shopping: ShoppingCart,
  groceries: ShoppingCart,
  transport: Car,
  transportation: Car,
  food: Hamburger,
  dining: Hamburger,
  restaurants: Hamburger,
  utilities: Lightning,
  bills: Lightning,
  subscriptions: CreditCard,
  payments: CreditCard,
  housing: House,
  rent: House,
  mortgages: House,
  health: Heartbeat,
  healthcare: Heartbeat,
  entertainment: GameController,
  travel: Airplane,
  other: DotsThree,
};

function getCategoryIcon(categoryName: string) {
  const key = categoryName.toLowerCase();
  return categoryIcons[key] || DotsThree;
}

function formatCurrency(amount: number, currency: string = "BHD") {
  return new Intl.NumberFormat("en-BH", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatCompactCurrency(amount: number, currency: string = "BHD") {
  if (amount >= 1000) {
    return new Intl.NumberFormat("en-BH", {
      style: "currency",
      currency: currency,
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(amount);
  }
  return formatCurrency(amount, currency);
}

export function SpendingLimitsSection({
  budgets,
  currency = "BHD",
  isLoading = false,
  variant = "personal",
  onAddLimit,
  onEditLimit,
}: SpendingLimitsSectionProps) {
  const isFamily = variant === "family";
  const { getCategoryLabel } = useCategories();

  // Loading skeleton
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="h-5 w-36 bg-muted rounded animate-pulse" />
            <div className="h-8 w-20 bg-muted rounded animate-pulse" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {[1, 2, 3].map((i) => (
              <div key={i} className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-lg bg-muted animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                    <div className="h-2 w-full bg-muted rounded animate-pulse" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (budgets.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <EmptyState
            icon={<Gauge size={28} className="text-muted-foreground" />}
            title={isFamily ? "No Family Limits Set" : "No Spending Limits"}
            description={
              isFamily
                ? "Set shared limits to help your family stay on budget."
                : "Track your spending with category budgets."
            }
            action={{
              label: isFamily ? "Set Family Limit" : "Set Limit",
              onClick: onAddLimit,
            }}
          />
        </CardContent>
      </Card>
    );
  }

  // Sort budgets: over budget first, then near limit, then others
  const sortedBudgets = [...budgets].sort((a, b) => {
    const aOver = a.percentage > 100;
    const bOver = b.percentage > 100;
    const aNear = a.percentage > 70 && a.percentage <= 100;
    const bNear = b.percentage > 70 && b.percentage <= 100;

    if (aOver && !bOver) return -1;
    if (!aOver && bOver) return 1;
    if (aNear && !bNear && !bOver) return -1;
    if (!aNear && bNear && !aOver) return 1;
    return b.percentage - a.percentage;
  });

  // Calculate summary stats
  const overBudgetCount = budgets.filter((b) => b.percentage > 100).length;
  const nearBudgetCount = budgets.filter((b) => b.percentage > 70 && b.percentage <= 100).length;
  const onTrackCount = budgets.filter((b) => b.percentage <= 70).length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            {isFamily ? (
              <Users size={18} className="text-blue-500" />
            ) : (
              <Gauge size={18} className="text-muted-foreground" />
            )}
            {isFamily ? "Family Limits" : "Spending Limits"}
          </CardTitle>
          <Button size="sm" variant="ghost" onClick={onAddLimit} className="h-8 px-2.5">
            <Plus size={14} />
            <span className="sr-only sm:not-sr-only sm:ml-1">Add</span>
          </Button>
        </div>

        {/* Summary badges */}
        {budgets.length > 1 && (
          <div className="flex items-center gap-2 mt-2">
            {overBudgetCount > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-red-500/10 text-red-600">
                <Warning size={10} weight="fill" />
                {overBudgetCount} over
              </span>
            )}
            {nearBudgetCount > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600">
                {nearBudgetCount} near limit
              </span>
            )}
            {onTrackCount > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600">
                <CheckCircle size={10} weight="fill" />
                {onTrackCount} on track
              </span>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="p-0">
        <div className="divide-y">
          {sortedBudgets.map((budget) => {
            const Icon = getCategoryIcon(budget.category);
            const isOverBudget = budget.percentage > 100;
            const isNearBudget = budget.percentage > 70 && budget.percentage <= 100;
            const overAmount = budget.spent - budget.amount;

            return (
              <div
                key={budget.id}
                onClick={() => onEditLimit(budget)}
                className={cn(
                  "group px-4 py-3 cursor-pointer transition-colors",
                  "hover:bg-muted/50",
                  isOverBudget && "bg-red-500/5",
                  isNearBudget && "bg-amber-500/5"
                )}
              >
                <div className="flex items-center gap-3">
                  {/* Category Icon */}
                  <div
                    className={cn(
                      "size-9 rounded-lg flex items-center justify-center shrink-0",
                      isOverBudget && "bg-red-500/10",
                      isNearBudget && "bg-amber-500/10",
                      !isOverBudget && !isNearBudget && isFamily && "bg-blue-500/10",
                      !isOverBudget && !isNearBudget && !isFamily && "bg-emerald-500/10"
                    )}
                  >
                    <Icon
                      size={18}
                      weight={isOverBudget ? "fill" : "regular"}
                      className={cn(
                        isOverBudget && "text-red-500",
                        isNearBudget && "text-amber-500",
                        !isOverBudget && !isNearBudget && isFamily && "text-blue-500",
                        !isOverBudget && !isNearBudget && !isFamily && "text-emerald-500"
                      )}
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Header row */}
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="font-medium text-sm truncate">
                        {getCategoryLabel(budget.category)}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className={cn(
                            "text-xs font-semibold tabular-nums",
                            isOverBudget && "text-red-600",
                            isNearBudget && "text-amber-600",
                            !isOverBudget && !isNearBudget && isFamily && "text-blue-600",
                            !isOverBudget && !isNearBudget && !isFamily && "text-emerald-600"
                          )}
                        >
                          {budget.percentage}%
                        </span>
                        <CaretRight
                          size={14}
                          className="text-muted-foreground/40 group-hover:text-muted-foreground transition-colors"
                        />
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="relative h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "absolute inset-y-0 left-0 rounded-full transition-all duration-500",
                          isOverBudget && "bg-red-500",
                          isNearBudget && "bg-amber-500",
                          !isOverBudget && !isNearBudget && isFamily && "bg-blue-500",
                          !isOverBudget && !isNearBudget && !isFamily && "bg-emerald-500"
                        )}
                        style={{ width: `${Math.min(budget.percentage, 100)}%` }}
                      />
                    </div>

                    {/* Footer row */}
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-[11px] text-muted-foreground tabular-nums">
                        {formatCompactCurrency(budget.spent, budget.currency)}
                        <span className="text-muted-foreground/60"> / </span>
                        {formatCompactCurrency(budget.amount, budget.currency)}
                      </span>
                      {isOverBudget ? (
                        <span className="text-[11px] font-medium text-red-600">
                          {formatCompactCurrency(overAmount, budget.currency)} over
                        </span>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">
                          {formatCompactCurrency(budget.remaining, budget.currency)} left
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
