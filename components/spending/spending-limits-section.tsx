"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { cn, formatCompactCurrency } from "@/lib/utils";
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
  Gauge,
  Users,
  CaretRight,
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
  onAddLimit?: () => void;
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
          <div className="h-5 w-36 bg-muted rounded animate-pulse" />
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {[1, 2, 3].map((i) => (
              <div key={i} className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-lg bg-muted animate-pulse" />
                  <div className="h-4 w-24 bg-muted rounded animate-pulse flex-1" />
                  <div className="h-4 w-16 bg-muted rounded animate-pulse" />
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
            action={onAddLimit ? {
              label: isFamily ? "Set Family Limit" : "Set Limit",
              onClick: onAddLimit,
            } : undefined}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          {isFamily ? (
            <Users size={18} className="text-blue-500" />
          ) : (
            <Gauge size={18} className="text-muted-foreground" />
          )}
          {isFamily ? "Family Limits" : "Spending Limits"}
        </CardTitle>
      </CardHeader>

      <CardContent className="p-0">
        <div className="divide-y">
          {budgets.map((budget) => {
            const Icon = getCategoryIcon(budget.category);

            return (
              <div
                key={budget.id}
                onClick={() => onEditLimit(budget)}
                className="group px-4 py-3 cursor-pointer transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  {/* Category Icon */}
                  <div
                    className={cn(
                      "size-9 rounded-lg flex items-center justify-center shrink-0",
                      isFamily ? "bg-blue-500/10" : "bg-muted"
                    )}
                  >
                    <Icon
                      size={18}
                      weight="regular"
                      className={isFamily ? "text-blue-500" : "text-muted-foreground"}
                    />
                  </div>

                  {/* Category Name */}
                  <span className="font-medium text-sm truncate flex-1">
                    {getCategoryLabel(budget.category)}
                  </span>

                  {/* Limit Amount */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-sm font-semibold tabular-nums">
                      {formatCompactCurrency(budget.amount, budget.currency)}
                    </span>
                    <CaretRight
                      size={14}
                      className="text-muted-foreground/40 group-hover:text-muted-foreground transition-colors"
                    />
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
