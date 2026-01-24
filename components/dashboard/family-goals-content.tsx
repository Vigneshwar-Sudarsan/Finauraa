"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { cn, formatCurrency } from "@/lib/utils";
import {
  Plus,
  Target,
  Calendar,
  Check,
  Confetti,
  Users,
  User,
  Trophy,
  Medal,
  Star,
  ClockCounterClockwise,
} from "@phosphor-icons/react";
import {
  SavingsGoalSheet,
  ContributeToGoalSheet,
  ContributionHistorySheet,
} from "@/components/spending";
import { useCategories } from "@/hooks/use-categories";

interface AssignedMember {
  id: string;
  user_id: string | null;
  is_whole_family: boolean;
  isWholeFamily?: boolean;
  contribution_amount: number;
  name: string;
}

interface FamilyGoal {
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
  created_by: string;
  created_by_name: string;
  assigned_members: AssignedMember[];
}

interface FamilyMember {
  userId: string;
  name: string;
  role: string;
}

interface FamilyGoalsData {
  goals: FamilyGoal[];
  familyGroup?: { id: string; name: string };
  familyMembers: FamilyMember[];
  isOwner: boolean;
  noFamilyGroup?: boolean;
  currentUserId?: string;
}

interface FamilyGoalsContentProps {
  refreshTrigger?: number;
  onCreateGoal: () => void;
}

export function FamilyGoalsContent({ refreshTrigger, onCreateGoal }: FamilyGoalsContentProps) {
  const [data, setData] = useState<FamilyGoalsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Categories hook
  const { getCategoryLabel } = useCategories();

  // Sheet states
  const [savingsGoalOpen, setSavingsGoalOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<FamilyGoal | null>(null);
  const [contributeOpen, setContributeOpen] = useState(false);
  const [contributeGoal, setContributeGoal] = useState<FamilyGoal | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyGoal, setHistoryGoal] = useState<FamilyGoal | null>(null);

  // Filter state
  const [filter, setFilter] = useState<"active" | "completed">("active");

  const fetchFamilyGoals = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/finance/family/savings-goals");
      if (!response.ok) {
        if (response.status === 403) {
          setError("Pro subscription required");
          return;
        }
        throw new Error("Failed to fetch family goals");
      }
      const goalsData = await response.json();
      setData(goalsData);
    } catch (err) {
      console.error("Failed to fetch family goals:", err);
      setError("Unable to load family goals");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFamilyGoals();
  }, [fetchFamilyGoals]);

  // Refresh when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      fetchFamilyGoals();
    }
  }, [refreshTrigger, fetchFamilyGoals]);

  const handleEditGoal = (goal: FamilyGoal) => {
    setSelectedGoal(goal);
    setSavingsGoalOpen(true);
  };

  const handleContribute = (goal: FamilyGoal) => {
    setContributeGoal(goal);
    setContributeOpen(true);
  };

  const handleViewHistory = (goal: FamilyGoal) => {
    setHistoryGoal(goal);
    setHistoryOpen(true);
  };

  // Calculate totals
  const goals = data?.goals || [];
  const activeGoals = goals.filter((g) => !g.is_completed);
  const completedGoals = goals.filter((g) => g.is_completed);
  const totalSaved = goals.reduce((sum, g) => sum + g.current_amount, 0);
  const totalTarget = goals.reduce((sum, g) => sum + g.target_amount, 0);
  const overallProgress = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0;

  // Loading state
  if (isLoading) {
    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
        {/* Overview Card Skeleton */}
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="bg-gradient-to-br from-blue-500/5 via-blue-500/10 to-blue-500/5 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 bg-muted rounded animate-pulse" />
                    <div className="h-3 w-24 bg-muted rounded animate-pulse" />
                  </div>
                  <div className="h-3 w-20 bg-muted rounded animate-pulse" />
                  <div className="h-8 w-32 bg-muted rounded animate-pulse" />
                </div>
                <div className="text-right space-y-2">
                  <div className="h-3 w-12 bg-muted rounded animate-pulse ml-auto" />
                  <div className="h-6 w-24 bg-muted rounded animate-pulse" />
                </div>
              </div>
              <div className="h-3 bg-muted rounded-full animate-pulse mb-2" />
              <div className="h-4 w-48 bg-muted rounded animate-pulse" />
            </div>
          </CardContent>
        </Card>

        {/* Goal Cards Skeleton */}
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="h-5 w-32 bg-muted rounded animate-pulse" />
                  <div className="h-3 w-20 bg-muted rounded animate-pulse" />
                </div>
                <div className="text-right space-y-1">
                  <div className="h-5 w-20 bg-muted rounded animate-pulse" />
                  <div className="h-3 w-16 bg-muted rounded animate-pulse ml-auto" />
                </div>
              </div>
              <div className="h-2 bg-muted rounded-full animate-pulse" />
              <div className="flex items-center justify-between">
                <div className="h-3 w-24 bg-muted rounded animate-pulse" />
                <div className="h-8 w-16 bg-muted rounded animate-pulse" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <EmptyState
          icon={<Users size={28} className="text-muted-foreground" />}
          title="Unable to load family goals"
          description={error}
        />
      </div>
    );
  }

  // No family group
  if (data?.noFamilyGroup) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <EmptyState
          icon={<Users size={28} className="text-muted-foreground" />}
          title="No Family Group"
          description="Create or join a family group to set shared savings goals."
          action={{
            label: "Manage Family",
            onClick: () => (window.location.href = "/dashboard/settings/family"),
          }}
        />
      </div>
    );
  }

  // No goals
  if (goals.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <EmptyState
          icon={<Target size={28} className="text-muted-foreground" />}
          title="No family goals yet"
          description="Set shared savings goals for your family to work towards together."
          action={{
            label: "Create Family Goal",
            onClick: onCreateGoal,
          }}
        />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      {/* Overview Card */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="bg-gradient-to-br from-blue-500/5 via-blue-500/10 to-blue-500/5 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                {/* Family Group Badge */}
                {data?.familyGroup && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                    <Users size={12} />
                    <span>{data.familyGroup.name}</span>
                  </div>
                )}
                <p className="text-sm text-muted-foreground font-medium">Family Savings</p>
                <p className="text-3xl font-bold">{formatCurrency(totalSaved)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground font-medium">Target</p>
                <p className="text-xl font-semibold text-muted-foreground">
                  {formatCurrency(totalTarget)}
                </p>
              </div>
            </div>
            <Progress value={overallProgress} className="h-3 mb-2 [&>div]:bg-blue-500" />
            <p className="text-sm text-muted-foreground">
              {overallProgress}% of total goals · {activeGoals.length} active, {completedGoals.length} completed
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Filter Chips */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setFilter("active")}
          className={cn(
            "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
            filter === "active"
              ? "bg-blue-500 text-white"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          )}
        >
          Active ({activeGoals.length})
        </button>
        {completedGoals.length > 0 && (
          <button
            onClick={() => setFilter("completed")}
            className={cn(
              "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
              filter === "completed"
                ? "bg-blue-500 text-white"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            Completed ({completedGoals.length})
          </button>
        )}
      </div>

      {/* Active Goals */}
      {filter === "active" && activeGoals.length > 0 && (
        <div className="grid gap-3">
          {activeGoals.map((goal) => {
            const progressPercentage = goal.progress_percentage ??
              Math.round((goal.current_amount / goal.target_amount) * 100);
            const remaining = goal.remaining ?? (goal.target_amount - goal.current_amount);

            // Get assigned members display
            const assignedDisplay = goal.assigned_members.length > 0
              ? goal.assigned_members.some(m => m.is_whole_family || m.isWholeFamily)
                ? "Whole Family"
                : goal.assigned_members.map(m => m.name).join(", ")
              : null;

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
                      <div className="flex items-center gap-2 flex-wrap mt-1">
                        {goal.category && (
                          <span className="text-xs text-muted-foreground">
                            {getCategoryLabel(goal.category, "savings")}
                          </span>
                        )}
                        {assignedDisplay && (
                          <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
                            {goal.assigned_members.some(m => m.is_whole_family || m.isWholeFamily) ? (
                              <Users size={10} className="mr-1" />
                            ) : (
                              <User size={10} className="mr-1" />
                            )}
                            {assignedDisplay}
                          </Badge>
                        )}
                      </div>
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
                      progressPercentage >= 100
                        ? "[&>div]:bg-emerald-500"
                        : "[&>div]:bg-blue-500"
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
                        <span className="bg-blue-500/10 text-blue-500 px-1.5 py-0.5 rounded text-[10px] font-medium">
                          Auto {goal.auto_contribute_percentage}%
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewHistory(goal);
                        }}
                        title="View contribution history"
                      >
                        <ClockCounterClockwise size={16} />
                      </Button>
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
                  </div>

                  {remaining > 0 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {formatCurrency(remaining, goal.currency)} to go
                    </p>
                  )}

                  {/* Contribution Leaderboard */}
                  {goal.assigned_members.filter(m => m.contribution_amount > 0).length > 0 && (
                    <div className="mt-4 pt-3 border-t">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                        <Trophy size={12} className="text-amber-500" />
                        <span className="font-medium">Contributors</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {goal.assigned_members
                          .filter(m => m.contribution_amount > 0)
                          .sort((a, b) => b.contribution_amount - a.contribution_amount)
                          .slice(0, 4)
                          .map((member, idx) => {
                            const percentage = goal.current_amount > 0
                              ? Math.round((member.contribution_amount / goal.current_amount) * 100)
                              : 0;
                            return (
                              <div
                                key={member.id}
                                className={cn(
                                  "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs",
                                  idx === 0 ? "bg-amber-500/10 text-amber-700 dark:text-amber-400" :
                                  idx === 1 ? "bg-zinc-200/50 text-zinc-600 dark:bg-zinc-700/50 dark:text-zinc-300" :
                                  idx === 2 ? "bg-orange-500/10 text-orange-700 dark:text-orange-400" :
                                  "bg-muted text-muted-foreground"
                                )}
                              >
                                {idx === 0 && <Trophy size={10} weight="fill" />}
                                {idx === 1 && <Medal size={10} weight="fill" />}
                                {idx === 2 && <Star size={10} weight="fill" />}
                                <span className="font-medium truncate max-w-[80px]">
                                  {member.name.split(" ")[0]}
                                </span>
                                <span className="opacity-70">{percentage}%</span>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Active Goals Empty State */}
      {filter === "active" && activeGoals.length === 0 && (
        <EmptyState
          icon={<Target size={28} className="text-muted-foreground" />}
          title="No active family goals"
          description="All your family goals have been completed! Create a new goal to keep saving together."
          action={{
            label: "Create Goal",
            onClick: onCreateGoal,
          }}
        />
      )}

      {/* Completed Goals */}
      {filter === "completed" && completedGoals.length > 0 && (
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
      )}

      {/* Sheet Modals */}
      <SavingsGoalSheet
        open={savingsGoalOpen}
        onOpenChange={setSavingsGoalOpen}
        onSuccess={fetchFamilyGoals}
        existingGoal={selectedGoal ? {
          id: selectedGoal.id,
          name: selectedGoal.name,
          target_amount: selectedGoal.target_amount,
          current_amount: selectedGoal.current_amount,
          currency: selectedGoal.currency,
          target_date: selectedGoal.target_date,
          category: selectedGoal.category,
          is_completed: selectedGoal.is_completed,
          auto_contribute: selectedGoal.auto_contribute,
          auto_contribute_percentage: selectedGoal.auto_contribute_percentage,
        } : null}
        defaultCurrency={goals[0]?.currency || "BHD"}
        isFamily={true}
        familyMembers={data?.familyMembers}
        assignedMembers={selectedGoal?.assigned_members}
      />

      <ContributeToGoalSheet
        open={contributeOpen}
        onOpenChange={setContributeOpen}
        onSuccess={fetchFamilyGoals}
        goal={contributeGoal ? {
          id: contributeGoal.id,
          name: contributeGoal.name,
          target_amount: contributeGoal.target_amount,
          current_amount: contributeGoal.current_amount,
          currency: contributeGoal.currency,
          is_completed: contributeGoal.is_completed,
          auto_contribute: contributeGoal.auto_contribute,
          auto_contribute_percentage: contributeGoal.auto_contribute_percentage,
        } : null}
        isFamily={true}
        familyMembers={data?.familyMembers}
        isOwner={data?.isOwner}
        currentUserId={data?.currentUserId}
      />

      <ContributionHistorySheet
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        goalId={historyGoal?.id || null}
        goalName={historyGoal?.name || ""}
        isFamily={true}
      />
    </div>
  );
}
