"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Check, Target, TrendUp, Warning, Plus } from "@phosphor-icons/react";

interface SavingsGoalsProps {
  data?: Record<string, unknown>;
  onAction?: (action: string, data?: Record<string, unknown>) => void;
  disabled?: boolean;
}

interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  progress: number;
  monthlyContribution: number;
  projectedCompletionDate: string | null;
  onTrack: boolean;
  currency: string;
}

interface SavingsGoalsData {
  goals: SavingsGoal[];
  totalSaved: number;
  totalTarget: number;
  currency: string;
}

export function SavingsGoals({ data, onAction, disabled }: SavingsGoalsProps) {
  const [goalsData, setGoalsData] = useState<SavingsGoalsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/finance/savings-goals");
        if (response.ok) {
          const result = await response.json();

          // Transform API response to expected format
          const goals = (result.goals || []).map((g: {
            id: string;
            name?: string;
            goal_name?: string;
            target_amount: number;
            current_amount: number;
            progress_percentage?: number;
            target_date?: string;
            currency?: string;
          }) => ({
            id: g.id,
            name: g.name || g.goal_name || "Unnamed Goal",
            targetAmount: g.target_amount,
            currentAmount: g.current_amount || 0,
            progress: g.progress_percentage || Math.round(((g.current_amount || 0) / g.target_amount) * 100),
            monthlyContribution: 0,
            projectedCompletionDate: g.target_date || null,
            onTrack: true,
            currency: g.currency || "BHD",
          }));

          // Calculate totals
          const totalSaved = goals.reduce((sum: number, g: SavingsGoal) => sum + g.currentAmount, 0);
          const totalTarget = goals.reduce((sum: number, g: SavingsGoal) => sum + g.targetAmount, 0);

          setGoalsData({
            goals,
            totalSaved,
            totalTarget,
            currency: goals[0]?.currency || "BHD",
          });
        }
      } catch (error) {
        console.error("Failed to fetch savings goals:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (data?.goals !== undefined) {
      setGoalsData(data as unknown as SavingsGoalsData);
      setIsLoading(false);
    } else {
      fetchData();
    }
  }, [data]);

  const formatCurrency = (amount: number) => {
    const currency = goalsData?.currency ?? "BHD";
    return new Intl.NumberFormat("en-BH", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: currency === "BHD" ? 3 : 0,
      maximumFractionDigits: currency === "BHD" ? 3 : 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "No target date";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  };

  if (isLoading) {
    return (
      <div className="w-full max-w-sm rounded-xl border border-border/60 bg-card p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-5 w-28 bg-muted rounded animate-pulse" />
          <div className="h-5 w-16 bg-muted rounded animate-pulse" />
        </div>
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="p-3 rounded-lg border border-border/40 space-y-2">
              <div className="flex items-center justify-between">
                <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                <div className="h-4 w-12 bg-muted rounded animate-pulse" />
              </div>
              <div className="h-2 bg-muted rounded-full" />
              <div className="h-3 w-32 bg-muted rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!goalsData || goalsData.goals.length === 0) {
    return (
      <div className="w-full max-w-sm rounded-xl border border-border/60 bg-card p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-muted-foreground" weight="duotone" />
          <p className="font-medium">Savings Goals</p>
        </div>
        <p className="text-sm text-muted-foreground">
          You haven&apos;t set up any savings goals yet. Create one to start tracking your progress toward your financial targets.
        </p>
        {!disabled && (
          <Button
            size="sm"
            onClick={() => onAction?.("create-savings-goal", { name: "My Savings Goal", suggestedAmount: 1000 })}
            className="w-full rounded-full"
          >
            <Plus className="h-4 w-4 mr-1.5" weight="bold" />
            Create Savings Goal
          </Button>
        )}
      </div>
    );
  }

  const overallProgress = goalsData.totalTarget > 0
    ? Math.round((goalsData.totalSaved / goalsData.totalTarget) * 100)
    : 0;

  return (
    <div className="w-full max-w-sm rounded-xl border border-border/60 bg-card p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" weight="duotone" />
          <p className="font-medium">Savings Goals</p>
        </div>
        <span className="text-sm font-semibold text-primary">{overallProgress}% overall</span>
      </div>

      {/* Total Progress Bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Total saved</span>
          <span>{formatCurrency(goalsData.totalSaved)} / {formatCurrency(goalsData.totalTarget)}</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${Math.min(overallProgress, 100)}%` }}
          />
        </div>
      </div>

      {/* Individual Goals */}
      <div className="space-y-3">
        {goalsData.goals.slice(0, 3).map((goal) => (
          <div key={goal.id} className="p-3 rounded-lg border border-border/40 space-y-2">
            {/* Goal Header */}
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm truncate max-w-[60%]">{goal.name}</span>
              <span className={`text-xs font-semibold ${goal.onTrack ? "text-green-600 dark:text-green-400" : "text-yellow-600 dark:text-yellow-400"}`}>
                {goal.progress}%
              </span>
            </div>

            {/* Progress Bar */}
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${goal.onTrack ? "bg-green-500" : "bg-yellow-500"}`}
                style={{ width: `${Math.min(goal.progress, 100)}%` }}
              />
            </div>

            {/* Goal Details */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}
              </span>
              <div className="flex items-center gap-1">
                {goal.onTrack ? (
                  <TrendUp className="h-3 w-3 text-green-600 dark:text-green-400" weight="bold" />
                ) : (
                  <Warning className="h-3 w-3 text-yellow-600 dark:text-yellow-400" weight="bold" />
                )}
                <span className="text-muted-foreground">{formatDate(goal.projectedCompletionDate)}</span>
              </div>
            </div>

            {/* Monthly Contribution Needed */}
            {goal.monthlyContribution > 0 && (
              <p className="text-xs text-muted-foreground">
                Need {formatCurrency(goal.monthlyContribution)}/month to reach goal
              </p>
            )}
          </div>
        ))}
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
            onClick={() => onAction?.("create-savings-goal", { name: "New Goal", suggestedAmount: 500 })}
            className="flex-1 rounded-full"
          >
            <Plus className="h-4 w-4 mr-1" weight="bold" />
            Add Goal
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAction?.("show-cash-flow")}
            className="flex-1 rounded-full"
          >
            Cash Flow
          </Button>
        </div>
      )}
    </div>
  );
}
