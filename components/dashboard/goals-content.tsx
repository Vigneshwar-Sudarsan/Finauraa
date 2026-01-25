"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardHeader } from "./dashboard-header";
import { Card, CardContent } from "@/components/ui/card";
import {
  Item,
  ItemMedia,
  ItemContent,
  ItemTitle,
  ItemDescription,
  ItemActions,
} from "@/components/ui/item";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useBankConnection } from "@/hooks/use-bank-connection";
import { useFeatureAccess } from "@/hooks/use-feature-access";
import { useSavingsGoals } from "@/hooks/use-savings-goals";
import { useSpending } from "@/hooks/use-spending";
import { cn, formatCurrency } from "@/lib/utils";
import {
  Plus,
  Target,
  Calendar,
  Check,
  TrendUp,
  Confetti,
  Bank,
  Lock,
  ClockCounterClockwise,
} from "@phosphor-icons/react";
import {
  SavingsGoalSheet,
  ContributeToGoalSheet,
  ContributionHistorySheet,
} from "@/components/spending";
import { useCategories } from "@/hooks/use-categories";
import { FamilyGoalsContent } from "./family-goals-content";

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
  const router = useRouter();
  const { goals, activeGoals, completedGoals, isLoading, mutate } = useSavingsGoals();
  const { data: spendingData } = useSpending();
  const [error, setError] = useState<string | null>(null);
  const [needsConsent, setNeedsConsent] = useState(false);
  const [activeTab, setActiveTab] = useState<"my" | "family">("my");
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Feature access for Pro/Family features
  const { canAccessFamilyFeatures, isLoading: featureLoading } = useFeatureAccess();

  // Categories hook
  const { getCategoryLabel } = useCategories();

  // Bank connection with consent dialog
  const { connectBank, isConnecting, ConsentDialog } = useBankConnection();

  // Sheet states
  const [savingsGoalOpen, setSavingsGoalOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<SavingsGoal | null>(null);
  const [contributeOpen, setContributeOpen] = useState(false);
  const [contributeGoal, setContributeGoal] = useState<SavingsGoal | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyGoal, setHistoryGoal] = useState<SavingsGoal | null>(null);
  const [familyRefreshTrigger, setFamilyRefreshTrigger] = useState(0);

  // Family members for assignment
  const [familyMembers, setFamilyMembers] = useState<{ userId: string; name: string; role: string }[]>([]);

  // Fetch family members when family tab is active
  useEffect(() => {
    if (activeTab === "family" && canAccessFamilyFeatures) {
      fetch("/api/finance/family/savings-goals")
        .then((res) => res.json())
        .then((data) => {
          if (data.familyMembers) {
            setFamilyMembers(data.familyMembers);
          }
        })
        .catch(console.error);
    }
  }, [activeTab, canAccessFamilyFeatures]);

  // Track dismissed income suggestions (session-based)
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());

  // Filter state
  const [filter, setFilter] = useState<"active" | "completed">("active");

  const recentIncome = spendingData?.totalIncome || 0;
  const defaultCurrency = goals[0]?.currency || "BHD";

  // Handle tab change - redirect to upgrade if not Pro
  const handleTabChange = (value: string) => {
    if (value === "family" && !featureLoading && !canAccessFamilyFeatures) {
      router.push("/dashboard/settings/subscription/plans");
      return;
    }
    setActiveTab(value as "my" | "family");
  };

  const handleRefreshAll = () => {
    if (activeTab === "family") {
      setFamilyRefreshTrigger((prev) => prev + 1);
    } else {
      mutate();
    }
  };

  // Suggested contributions (filter out dismissed ones)
  const suggestedContributions = activeGoals
    .filter((g) => g.auto_contribute && g.auto_contribute_percentage && recentIncome)
    .filter((g) => !dismissedSuggestions.has(g.id))
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

  const handleViewHistory = (goal: SavingsGoal) => {
    setHistoryGoal(goal);
    setHistoryOpen(true);
  };

  const handleSuggestedContribute = (goal: SavingsGoal) => {
    setDismissedSuggestions((prev) => new Set(prev).add(goal.id));
    setContributeGoal(goal);
    setContributeOpen(true);
  };

  // Calculate totals
  const totalSaved = goals.reduce((sum, g) => sum + g.current_amount, 0);
  const totalTarget = goals.reduce((sum, g) => sum + g.target_amount, 0);
  const overallProgress = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0;

  return (
    <div className="flex flex-col h-full">
      <DashboardHeader title="Savings Goals" />

      {/* Tab Navigation Row */}
      <div className="px-4 md:px-6 pt-4 md:pt-6 pb-4 max-w-4xl mx-auto w-full">
        <div className="flex items-center justify-between gap-4">
          {/* Tabs */}
          {mounted ? (
            <Tabs value={activeTab} onValueChange={handleTabChange}>
              <TabsList>
                <TabsTrigger value="my">My Goals</TabsTrigger>
                <TabsTrigger
                  value="family"
                  disabled={!canAccessFamilyFeatures && !featureLoading}
                  className={cn(
                    !canAccessFamilyFeatures && !featureLoading && "opacity-50"
                  )}
                >
                  {!canAccessFamilyFeatures && !featureLoading && (
                    <Lock size={14} />
                  )}
                  Family
                </TabsTrigger>
              </TabsList>
            </Tabs>
          ) : (
            <div className="w-[180px] h-9 bg-muted rounded-lg" />
          )}

          {/* Desktop New Goal Button */}
          <Button
            size="sm"
            onClick={handleCreateGoal}
            className="hidden sm:flex"
          >
            <Plus size={16} />
            New Goal
          </Button>
        </div>
      </div>

      {/* Family Tab Content */}
      {activeTab === "family" && (
        featureLoading ? (
          <div className="flex-1 overflow-auto pb-24 sm:pb-0">
            <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
              {/* Loading skeleton */}
              <Card className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="bg-gradient-to-br from-blue-500/5 via-blue-500/10 to-blue-500/5 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="space-y-2">
                        <div className="h-3 w-20 bg-muted rounded animate-pulse" />
                        <div className="h-8 w-32 bg-muted rounded animate-pulse" />
                      </div>
                      <div className="text-right space-y-2">
                        <div className="h-3 w-12 bg-muted rounded animate-pulse ml-auto" />
                        <div className="h-6 w-24 bg-muted rounded animate-pulse" />
                      </div>
                    </div>
                    <div className="h-3 bg-muted rounded-full animate-pulse mb-2" />
                  </div>
                </CardContent>
              </Card>
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
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : canAccessFamilyFeatures ? (
          <div className="flex-1 overflow-auto pb-24 sm:pb-0">
            <FamilyGoalsContent
              refreshTrigger={familyRefreshTrigger}
              onCreateGoal={handleCreateGoal}
            />
          </div>
        ) : null
      )}

      {/* My Tab Content */}
      {activeTab === "my" && (
        <>
          {/* Error State - Needs Bank Connection */}
          {error && !isLoading && needsConsent && (
            <div className="flex-1 flex items-center justify-center">
              <EmptyState
                icon={<Bank size={28} className="text-muted-foreground" />}
                title="Connect your bank"
                description="Connect your bank account to track your savings goals and progress."
                action={{
                  label: isConnecting ? "Connecting..." : "Connect Bank",
                  onClick: connectBank,
                  loading: isConnecting,
                }}
              />
            </div>
          )}

          {/* Error State - Other Errors */}
          {error && !isLoading && !needsConsent && (
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
            <div className="flex-1 overflow-auto pb-24 sm:pb-0">
              <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
                {/* Overview Card Skeleton */}
                <Card className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="space-y-2">
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

                {/* Section label skeleton */}
                <div className="h-4 w-28 bg-muted rounded animate-pulse" />

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
            </div>
          )}

          {/* Main Content */}
          {!isLoading && !error && goals.length > 0 && (
            <div className="flex-1 overflow-auto pb-24 sm:pb-0">
              <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
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

                {/* Suggested Contributions - Stacked Cards */}
                {suggestedContributions.length > 0 && (
                  <div
                    className="relative"
                    style={{ paddingTop: `${(suggestedContributions.length - 1) * 6}px` }}
                  >
                    {/* Background cards (peeking at top) */}
                    {suggestedContributions.slice(1).map(({ goal }, index) => (
                      <div
                        key={goal.id}
                        className="absolute inset-x-0 h-3 rounded-t-xl border border-b-0 border-primary/20 bg-card overflow-hidden"
                        style={{
                          top: `${index * 6}px`,
                          zIndex: index + 1,
                        }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5" />
                      </div>
                    ))}
                    {/* Front card (fully visible) */}
                    <Card
                      className="relative border-primary/20 bg-card overflow-hidden"
                      style={{ zIndex: suggestedContributions.length }}
                    >
                      <CardContent className="p-0 relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5" />
                        <Item variant="default" size="sm" className="relative">
                          <ItemMedia variant="icon">
                            <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
                              <TrendUp size={20} className="text-primary" weight="bold" />
                            </div>
                          </ItemMedia>
                          <ItemContent>
                            <ItemTitle className="flex items-center gap-2">
                              Income detected!
                            </ItemTitle>
                            <ItemDescription>
                              {suggestedContributions.length} goal{suggestedContributions.length > 1 ? "s" : ""} to contribute
                            </ItemDescription>
                          </ItemContent>
                          <ItemActions>
                            <Button
                              size="sm"
                              onClick={() => handleSuggestedContribute(suggestedContributions[0].goal)}
                            >
                              Add {formatCurrency(suggestedContributions[0].suggestedAmount, suggestedContributions[0].goal.currency)}
                            </Button>
                          </ItemActions>
                        </Item>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Filter Chips */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setFilter("active")}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                      filter === "active"
                        ? "bg-primary text-primary-foreground"
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
                          ? "bg-primary text-primary-foreground"
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
                    title="No active goals"
                    description="All your goals have been completed! Create a new goal to keep saving."
                    action={{
                      label: "Create Goal",
                      onClick: handleCreateGoal,
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
              </div>
            </div>
          )}
        </>
      )}

      {/* Mobile FAB with Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="icon"
            className="fixed bottom-20 right-4 size-14 rounded-full shadow-lg sm:hidden z-50"
          >
            <Plus size={24} weight="bold" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="top" className="mb-2 min-w-0 w-auto">
          <DropdownMenuItem onClick={handleCreateGoal} className="gap-2">
            <Target size={16} className="shrink-0" />
            <span>{activeTab === "family" ? "New Family Goal" : "New Goal"}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Sheet Modals */}
      <SavingsGoalSheet
        open={savingsGoalOpen}
        onOpenChange={setSavingsGoalOpen}
        onSuccess={handleRefreshAll}
        existingGoal={selectedGoal}
        defaultCurrency={defaultCurrency}
        isFamily={activeTab === "family"}
        familyMembers={activeTab === "family" ? familyMembers : []}
      />

      <ContributeToGoalSheet
        open={contributeOpen}
        onOpenChange={setContributeOpen}
        onSuccess={handleRefreshAll}
        goal={contributeGoal}
        suggestedAmount={
          contributeGoal?.auto_contribute && contributeGoal?.auto_contribute_percentage && recentIncome
            ? recentIncome * (contributeGoal.auto_contribute_percentage / 100)
            : undefined
        }
        isFamily={activeTab === "family"}
      />

      <ContributionHistorySheet
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        goalId={historyGoal?.id || null}
        goalName={historyGoal?.name || ""}
        isFamily={false}
      />

      {/* Bank Consent Dialog */}
      <ConsentDialog />
    </div>
  );
}
