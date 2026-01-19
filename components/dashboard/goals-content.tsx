"use client";

import { useState, useEffect, useCallback } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { MobileNavButton } from "@/components/mobile-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import {
  Plus,
  Target,
  Calendar,
  Check,
  TrendUp,
  Confetti,
} from "@phosphor-icons/react";
import {
  SavingsGoalSheet,
  ContributeToGoalSheet,
} from "@/components/spending";
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

export function GoalsContent() {
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recentIncome, setRecentIncome] = useState(0);

  // Sheet states
  const [savingsGoalOpen, setSavingsGoalOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<SavingsGoal | null>(null);
  const [contributeOpen, setContributeOpen] = useState(false);
  const [contributeGoal, setContributeGoal] = useState<SavingsGoal | null>(null);

  const fetchGoals = useCallback(async () => {
    try {
      const response = await fetch("/api/finance/savings-goals");
      if (!response.ok) throw new Error("Failed to fetch savings goals");
      const { goals: goalsData } = await response.json();
      setGoals(goalsData || []);
    } catch (err) {
      console.error("Failed to fetch savings goals:", err);
      setError("Unable to load savings goals");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchIncome = useCallback(async () => {
    try {
      const response = await fetch("/api/finance/insights/spending");
      if (!response.ok) return;
      const data = await response.json();
      setRecentIncome(data.totalIncome || 0);
    } catch (err) {
      console.error("Failed to fetch income:", err);
    }
  }, []);

  useEffect(() => {
    fetchGoals();
    fetchIncome();
  }, [fetchGoals, fetchIncome]);

  const activeGoals = goals.filter((g) => !g.is_completed);
  const completedGoals = goals.filter((g) => g.is_completed);

  const defaultCurrency = goals[0]?.currency || "BHD";

  const formatCurrency = (amount: number, currency: string = defaultCurrency) => {
    return new Intl.NumberFormat("en-BH", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Suggested contributions
  const suggestedContributions = activeGoals
    .filter((g) => g.auto_contribute && g.auto_contribute_percentage && recentIncome)
    .map((g) => ({
      goal: g,
      suggestedAmount: recentIncome * (g.auto_contribute_percentage! / 100),
    }));

  const handleCreateGoal = () => {
    setSelectedGoal(null);
    setSavingsGoalOpen(true);
  };

  const handleEditGoal = (goal: SavingsGoal) => {
    setSelectedGoal(goal);
    setSavingsGoalOpen(true);
  };

  const handleContribute = (goal: SavingsGoal) => {
    setContributeGoal(goal);
    setContributeOpen(true);
  };

  // Calculate totals
  const totalSaved = goals.reduce((sum, g) => sum + g.current_amount, 0);
  const totalTarget = goals.reduce((sum, g) => sum + g.target_amount, 0);
  const overallProgress = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="!self-center h-4" />
          <h1 className="font-semibold">Savings Goals</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCreateGoal}
          >
            <Plus size={16} />
            <span className="hidden sm:inline">New Goal</span>
          </Button>
          <MobileNavButton />
        </div>
      </header>

      {/* Error State */}
      {error && !isLoading && (
        <div className="flex-1 flex items-center justify-center">
          <EmptyState
            icon={<Target size={28} className="text-muted-foreground" />}
            title="Unable to load goals"
            description={error}
            action={{
              label: "Try Again",
              onClick: () => window.location.reload(),
              variant: "outline",
            }}
          />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && goals.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <EmptyState
            icon={<Target size={28} className="text-muted-foreground" />}
            title="No savings goals yet"
            description="Set a goal to start tracking your progress toward your financial targets."
            action={{
              label: "Create Goal",
              onClick: handleCreateGoal,
            }}
          />
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex-1 overflow-auto p-4 md:p-6">
          <div className="max-w-2xl mx-auto space-y-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-6 w-32 bg-muted rounded animate-pulse" />
                  <div className="h-6 w-24 bg-muted rounded animate-pulse" />
                </div>
                <div className="h-3 bg-muted rounded-full animate-pulse mb-2" />
                <div className="h-4 w-48 bg-muted rounded animate-pulse" />
              </CardContent>
            </Card>
            {[1, 2].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="h-5 w-32 bg-muted rounded animate-pulse" />
                      <div className="h-5 w-20 bg-muted rounded animate-pulse" />
                    </div>
                    <div className="h-2 bg-muted rounded-full animate-pulse" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      {!isLoading && !error && goals.length > 0 && (
        <div className="flex-1 overflow-auto p-4 md:p-6">
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Overview Card */}
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <div className="bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-sm text-muted-foreground font-medium">Total Saved</p>
                      <p className="text-3xl font-bold">{formatCurrency(totalSaved)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground font-medium">Target</p>
                      <p className="text-xl font-semibold text-muted-foreground">
                        {formatCurrency(totalTarget)}
                      </p>
                    </div>
                  </div>
                  <Progress value={overallProgress} className="h-3 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {overallProgress}% of total goals · {activeGoals.length} active, {completedGoals.length} completed
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Suggested Contributions Banner */}
            {suggestedContributions.length > 0 && (
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <TrendUp size={20} className="text-primary" weight="bold" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">Income detected!</p>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        Based on your auto-contribute settings:
                      </p>
                      <div className="mt-3 space-y-2">
                        {suggestedContributions.map(({ goal, suggestedAmount }) => (
                          <div key={goal.id} className="flex items-center justify-between gap-2">
                            <span className="text-sm truncate">{goal.name}</span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleContribute(goal)}
                              className="shrink-0"
                            >
                              Add {formatCurrency(suggestedAmount, goal.currency)}
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
            {activeGoals.length > 0 && (
              <section className="space-y-4">
                <h2 className="text-sm font-medium text-muted-foreground px-1">
                  Active Goals ({activeGoals.length})
                </h2>
                <div className="grid gap-3">
                  {activeGoals.map((goal) => {
                    const progressPercentage = goal.progress_percentage ??
                      Math.round((goal.current_amount / goal.target_amount) * 100);
                    const remaining = goal.remaining ?? (goal.target_amount - goal.current_amount);

                    return (
                      <Card
                        key={goal.id}
                        className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => handleEditGoal(goal)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
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
                              "h-2 mb-3",
                              progressPercentage >= 100 && "[&>div]:bg-emerald-500"
                            )}
                          />

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="font-medium tabular-nums">{progressPercentage}%</span>
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
                              {goal.auto_contribute && (
                                <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[10px] font-medium">
                                  Auto {goal.auto_contribute_percentage}%
                                </span>
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleContribute(goal);
                              }}
                            >
                              <Plus size={14} />
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
              </section>
            )}

            {/* Completed Goals */}
            {completedGoals.length > 0 && (
              <section className="space-y-4">
                <h2 className="text-sm font-medium text-muted-foreground px-1">
                  Completed ({completedGoals.length})
                </h2>
                <div className="grid gap-2">
                  {completedGoals.map((goal) => (
                    <Card
                      key={goal.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleEditGoal(goal)}
                    >
                      <CardContent className="p-3 flex items-center gap-3">
                        <div className="size-10 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                          <Confetti size={20} className="text-emerald-500" weight="fill" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{goal.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(goal.target_amount, goal.currency)} saved
                          </p>
                        </div>
                        <Check size={20} className="text-emerald-500 shrink-0" weight="bold" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      )}

      {/* Sheet Modals */}
      <SavingsGoalSheet
        open={savingsGoalOpen}
        onOpenChange={setSavingsGoalOpen}
        onSuccess={fetchGoals}
        existingGoal={selectedGoal}
        defaultCurrency={defaultCurrency}
      />

      <ContributeToGoalSheet
        open={contributeOpen}
        onOpenChange={setContributeOpen}
        onSuccess={fetchGoals}
        goal={contributeGoal}
        suggestedAmount={
          contributeGoal?.auto_contribute && contributeGoal?.auto_contribute_percentage && recentIncome
            ? recentIncome * (contributeGoal.auto_contribute_percentage / 100)
            : undefined
        }
      />
    </div>
  );
}
