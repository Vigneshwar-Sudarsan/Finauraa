"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Plus,
  Target,
  CaretRight,
  Calendar,
  Check,
  TrendUp,
} from "@phosphor-icons/react";
import { getCategoryLabel } from "@/lib/constants/categories";

interface SavingsGoal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  currency: string;
  target_date?: string;
  category?: string;
  is_completed: boolean;
  auto_contribute: boolean;
  auto_contribute_percentage?: number;
  progress_percentage?: number;
  remaining?: number;
  days_remaining?: number | null;
}

interface SavingsGoalsSectionProps {
  goals: SavingsGoal[];
  isLoading?: boolean;
  onCreateGoal: () => void;
  onEditGoal: (goal: SavingsGoal) => void;
  onContribute: (goal: SavingsGoal) => void;
  recentIncome?: number;
  defaultCurrency?: string;
}

export function SavingsGoalsSection({
  goals,
  isLoading,
  onCreateGoal,
  onEditGoal,
  onContribute,
  recentIncome,
  defaultCurrency = "BHD",
}: SavingsGoalsSectionProps) {
  const activeGoals = goals.filter((g) => !g.is_completed);
  const completedGoals = goals.filter((g) => g.is_completed);

  const formatCurrency = (amount: number, currency: string = defaultCurrency) => {
    return new Intl.NumberFormat("en-BH", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Check if any goal has auto-contribute enabled and we have recent income
  const suggestedContributions = activeGoals
    .filter((g) => g.auto_contribute && g.auto_contribute_percentage && recentIncome)
    .map((g) => ({
      goal: g,
      suggestedAmount: (recentIncome! * (g.auto_contribute_percentage! / 100)),
    }));

  if (isLoading) {
    return (
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-6 w-32 bg-muted rounded animate-pulse" />
          <div className="h-8 w-24 bg-muted rounded animate-pulse" />
        </div>
        <div className="grid gap-3">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="h-5 w-32 bg-muted rounded animate-pulse" />
                    <div className="h-5 w-20 bg-muted rounded animate-pulse" />
                  </div>
                  <div className="h-2 bg-muted rounded-full animate-pulse" />
                  <div className="flex items-center justify-between">
                    <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                    <div className="h-4 w-16 bg-muted rounded animate-pulse" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target size={20} className="text-muted-foreground" />
          <h2 className="text-lg font-semibold">Savings Goals</h2>
        </div>
        <Button variant="outline" size="sm" onClick={onCreateGoal}>
          <Plus size={16} />
          New Goal
        </Button>
      </div>

      {/* Suggested Contributions Banner */}
      {suggestedContributions.length > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <TrendUp size={16} className="text-primary" weight="bold" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">Income detected!</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Based on your settings, consider adding to your goals:
                </p>
                <div className="mt-2 space-y-2">
                  {suggestedContributions.map(({ goal, suggestedAmount }) => (
                    <div key={goal.id} className="flex items-center justify-between gap-2">
                      <span className="text-sm truncate">{goal.name}</span>
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => onContribute(goal)}
                        className="shrink-0"
                      >
                        +{formatCurrency(suggestedAmount, goal.currency)}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Goals */}
      {activeGoals.length > 0 ? (
        <div className="grid gap-3">
          {activeGoals.map((goal) => {
            const progressPercentage = goal.progress_percentage ??
              Math.round((goal.current_amount / goal.target_amount) * 100);
            const remaining = goal.remaining ?? (goal.target_amount - goal.current_amount);

            return (
              <Card
                key={goal.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => onEditGoal(goal)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-medium">{goal.name}</h3>
                      {goal.category && (
                        <span className="text-xs text-muted-foreground">
                          {getCategoryLabel(goal.category, "savings")}
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-semibold tabular-nums">
                        {formatCurrency(goal.current_amount, goal.currency)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        of {formatCurrency(goal.target_amount, goal.currency)}
                      </p>
                    </div>
                  </div>

                  <Progress
                    value={progressPercentage}
                    className={cn(
                      "h-2 mb-2",
                      progressPercentage >= 100 && "[&>div]:bg-emerald-500"
                    )}
                  />

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="tabular-nums">{progressPercentage}%</span>
                      {goal.days_remaining !== null && goal.days_remaining !== undefined && (
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          {goal.days_remaining > 0
                            ? `${goal.days_remaining} days left`
                            : goal.days_remaining === 0
                              ? "Due today"
                              : "Overdue"}
                        </span>
                      )}
                    </div>
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        onContribute(goal);
                      }}
                    >
                      <Plus size={12} />
                      Add
                    </Button>
                  </div>

                  {remaining > 0 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {formatCurrency(remaining, goal.currency)} to go
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="p-6 flex flex-col items-center justify-center text-center">
            <div className="size-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <Target size={24} className="text-muted-foreground" />
            </div>
            <h3 className="font-medium mb-1">No savings goals yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Set a goal to start tracking your progress
            </p>
            <Button variant="outline" onClick={onCreateGoal}>
              <Plus size={16} />
              Create Goal
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Completed Goals (collapsed) */}
      {completedGoals.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {completedGoals.length} completed goal{completedGoals.length !== 1 ? "s" : ""}
          </p>
          <div className="grid gap-2">
            {completedGoals.map((goal) => (
              <Card
                key={goal.id}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => onEditGoal(goal)}
              >
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="size-8 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <Check size={16} className="text-emerald-500" weight="bold" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{goal.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(goal.target_amount, goal.currency)}
                    </p>
                  </div>
                  <CaretRight size={16} className="text-muted-foreground" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
