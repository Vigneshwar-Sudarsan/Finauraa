"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Item,
  ItemMedia,
  ItemContent,
  ItemTitle,
  ItemDescription,
  ItemActions,
  ItemGroup,
  ItemSeparator,
} from "@/components/ui/item";
import { EmptyState } from "@/components/ui/empty-state";
import { cn, formatCurrency, formatCompactCurrency } from "@/lib/utils";
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
  TrendUp,
  TrendDown,
  Money,
  Briefcase,
  Bank,
  ArrowUp,
  ArrowDown,
  Gauge,
  Users,
  User,
  ShieldCheck,
} from "@phosphor-icons/react";
import {
  FamilySpendingConsentDialog,
  SpendingLimitsSection,
  SetSpendingLimitSheet,
} from "@/components/spending";

interface MemberContribution {
  userId: string;
  name: string;
  percentage: number;
}

interface FamilyCategory {
  id: string;
  name: string;
  amount: number;
  count: number;
  percentage: number;
  contributions: MemberContribution[];
}

interface FamilyMember {
  userId: string;
  name: string;
  role: string;
  amount: number;
  percentage: number;
}

interface FamilySpendingData {
  totalSpending: number;
  totalIncome: number;
  currency: string;
  categories: FamilyCategory[];
  memberContributions: FamilyMember[];
  familyGroup?: { id: string; name: string };
  memberCount?: number;
  noFamilyGroup?: boolean;
  noConsentedMembers?: boolean;
  message?: string;
}

interface FamilyBudget {
  id: string;
  category: string;
  amount: number;
  currency: string;
  spent: number;
  remaining: number;
  percentage: number;
  show_member_breakdown: boolean;
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
  "other expenses": DotsThree,
  "other loans": CreditCard,
  "salary & wages": Briefcase,
  "retirement & pensions": Bank,
  "other income": Money,
};

function getCategoryIcon(categoryName: string) {
  const key = categoryName.toLowerCase();
  return categoryIcons[key] || DotsThree;
}

function formatCategoryName(name: string) {
  return name
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

interface FamilySpendingContentProps {
  refreshTrigger?: number; // Increment this to trigger a refresh
}

export function FamilySpendingContent({ refreshTrigger }: FamilySpendingContentProps) {
  const [data, setData] = useState<FamilySpendingData | null>(null);
  const [budgets, setBudgets] = useState<FamilyBudget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Consent state
  const [hasConsent, setHasConsent] = useState<boolean | null>(null);
  const [familyGroupName, setFamilyGroupName] = useState<string>("your family");
  const [showConsentDialog, setShowConsentDialog] = useState(false);

  // Spending limit sheet state
  const [setLimitOpen, setSetLimitOpen] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<FamilyBudget | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [isLoadingBudgets, setIsLoadingBudgets] = useState(true);

  const checkConsent = useCallback(async () => {
    try {
      const response = await fetch("/api/finance/family/consent");
      if (!response.ok) {
        if (response.status === 403) {
          setError("Pro subscription required");
          return;
        }
        throw new Error("Failed to check consent");
      }
      const consentData = await response.json();
      setHasConsent(consentData.hasConsent);
      setFamilyGroupName(consentData.familyGroupName || "your family");

      if (!consentData.inFamilyGroup) {
        setError("You are not in a family group");
      }
    } catch (err) {
      console.error("Failed to check consent:", err);
      setError("Unable to check consent status");
    }
  }, []);

  const fetchFamilySpending = useCallback(async () => {
    try {
      const response = await fetch("/api/finance/family/spending");
      if (!response.ok) {
        if (response.status === 403) {
          setError("Pro subscription required");
          return;
        }
        throw new Error("Failed to fetch family spending");
      }
      const spendingData = await response.json();
      setData(spendingData);
    } catch (err) {
      console.error("Failed to fetch family spending:", err);
      setError("Unable to load family spending data");
    }
  }, []);

  const fetchFamilyBudgets = useCallback(async () => {
    try {
      const response = await fetch("/api/finance/family/budgets");
      if (!response.ok) return;
      const { budgets: budgetsData } = await response.json();
      setBudgets(budgetsData || []);
    } catch (err) {
      console.error("Failed to fetch family budgets:", err);
    } finally {
      setIsLoadingBudgets(false);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await checkConsent();
      await Promise.all([fetchFamilySpending(), fetchFamilyBudgets()]);
      setIsLoading(false);
    };
    loadData();
  }, [checkConsent, fetchFamilySpending, fetchFamilyBudgets]);

  // Refresh when refreshTrigger changes (external trigger)
  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      fetchFamilySpending();
      fetchFamilyBudgets();
    }
  }, [refreshTrigger, fetchFamilySpending, fetchFamilyBudgets]);

  const handleGiveConsent = async () => {
    const response = await fetch("/api/finance/family/consent", {
      method: "POST",
    });
    if (!response.ok) {
      throw new Error("Failed to save consent");
    }
    setHasConsent(true);
    // Refresh data after consent
    await Promise.all([fetchFamilySpending(), fetchFamilyBudgets()]);
  };

  // Get budget for a category
  const getBudgetForCategory = (categoryName: string): FamilyBudget | undefined => {
    return budgets.find(
      (b) => b.category.toLowerCase() === categoryName.toLowerCase()
    );
  };

  const netAmount = data ? data.totalIncome - data.totalSpending : 0;
  const savingsRate = data && data.totalIncome > 0
    ? Math.round((netAmount / data.totalIncome) * 100)
    : 0;

  const spendingRatio = data && data.totalIncome > 0
    ? Math.min((data.totalSpending / data.totalIncome) * 100, 100)
    : 0;

  // Loading state
  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-3 space-y-6">
            {/* Hero Card Skeleton */}
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <div className="bg-gradient-to-br from-blue-500/5 via-blue-500/10 to-blue-500/5 p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 bg-muted rounded animate-pulse" />
                        <div className="h-3 w-24 bg-muted rounded animate-pulse" />
                      </div>
                      <div className="h-3 w-32 bg-muted rounded animate-pulse" />
                      <div className="h-9 w-36 bg-muted rounded animate-pulse" />
                      <div className="h-6 w-28 bg-muted rounded-full animate-pulse" />
                    </div>
                    <div className="size-28 rounded-full bg-muted animate-pulse" />
                  </div>
                </div>
                <div className="grid grid-cols-2 divide-x">
                  <div className="p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="size-6 rounded-full bg-muted animate-pulse" />
                      <div className="h-3 w-20 bg-muted rounded animate-pulse" />
                    </div>
                    <div className="h-6 w-24 bg-muted rounded animate-pulse" />
                  </div>
                  <div className="p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="size-6 rounded-full bg-muted animate-pulse" />
                      <div className="h-3 w-24 bg-muted rounded animate-pulse" />
                    </div>
                    <div className="h-6 w-24 bg-muted rounded animate-pulse" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Categories Skeleton */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="size-5 bg-muted rounded animate-pulse" />
                      <div className="h-5 w-40 bg-muted rounded animate-pulse" />
                    </div>
                    <div className="h-3 w-52 bg-muted rounded animate-pulse" />
                  </div>
                  <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className={i > 1 ? "border-t" : ""}>
                    <div className="flex items-center gap-3 p-3">
                      <div className="size-10 rounded-xl bg-muted animate-pulse" />
                      <div className="flex-1 space-y-1">
                        <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                        <div className="h-3 w-40 bg-muted rounded animate-pulse" />
                      </div>
                      <div className="text-right space-y-1">
                        <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                        <div className="h-3 w-16 bg-muted rounded animate-pulse ml-auto" />
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Spending Limits Skeleton */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="size-5 bg-muted rounded animate-pulse" />
                    <div className="h-5 w-28 bg-muted rounded animate-pulse" />
                  </div>
                  <div className="h-8 w-16 bg-muted rounded animate-pulse" />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {[1, 2].map((i) => (
                  <div key={i} className={i > 1 ? "border-t" : ""}>
                    <div className="flex items-center gap-3 p-3">
                      <div className="size-10 rounded-xl bg-muted animate-pulse" />
                      <div className="flex-1 space-y-1">
                        <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                        <div className="h-3 w-32 bg-muted rounded animate-pulse" />
                      </div>
                      <div className="text-right space-y-1">
                        <div className="h-4 w-16 bg-muted rounded animate-pulse" />
                        <div className="h-1.5 w-16 bg-muted rounded-full animate-pulse" />
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Member Contributions Skeleton */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <div className="size-5 bg-muted rounded animate-pulse" />
                  <div className="h-5 w-40 bg-muted rounded animate-pulse" />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {[1, 2, 3].map((i) => (
                  <div key={i} className={i > 1 ? "border-t" : ""}>
                    <div className="flex items-center gap-3 p-3">
                      <div className="size-10 rounded-xl bg-muted animate-pulse" />
                      <div className="flex-1 space-y-1">
                        <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                        <div className="h-3 w-14 bg-muted rounded animate-pulse" />
                      </div>
                      <div className="text-right space-y-1">
                        <div className="h-4 w-10 bg-muted rounded animate-pulse" />
                        <div className="h-3 w-14 bg-muted rounded animate-pulse ml-auto" />
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Privacy Note Skeleton */}
            <Card className="bg-muted/30">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="size-5 bg-muted rounded animate-pulse shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                    <div className="h-3 w-full bg-muted rounded animate-pulse" />
                    <div className="h-3 w-3/4 bg-muted rounded animate-pulse" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <EmptyState
          icon={<Users size={28} className="text-muted-foreground" />}
          title="Unable to load family spending"
          description={error}
        />
      </div>
    );
  }

  // Consent required state
  if (hasConsent === false) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <EmptyState
          icon={<ShieldCheck size={28} className="text-muted-foreground" />}
          title="Enable Family Spending"
          description={`To view family spending, you need to consent to share your category totals with ${familyGroupName}.`}
          action={{
            label: "Enable Sharing",
            onClick: () => setShowConsentDialog(true),
          }}
        />
        <FamilySpendingConsentDialog
          open={showConsentDialog}
          onOpenChange={setShowConsentDialog}
          onConsent={handleGiveConsent}
          familyGroupName={familyGroupName}
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
          description="Create or join a family group to see shared spending insights."
          action={{
            label: "Manage Family",
            onClick: () => (window.location.href = "/dashboard/settings/family"),
          }}
        />
      </div>
    );
  }

  // No consented members
  if (data?.noConsentedMembers) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <EmptyState
          icon={<Users size={28} className="text-muted-foreground" />}
          title="No Shared Data Yet"
          description="No family members have enabled spending sharing yet. Invite your family members and ask them to enable sharing."
        />
      </div>
    );
  }

  // No data
  if (!data || (data.totalSpending === 0 && data.totalIncome === 0)) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <EmptyState
          icon={<Users size={28} className="text-muted-foreground" />}
          title="No Family Spending Yet"
          description="Family spending will appear here once family members have transactions. Make sure all members have enabled spending sharing."
        />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left Column - Main Content (60% on desktop) */}
        <div className="lg:col-span-3 space-y-6">
          {/* Hero Card - Family Financial Overview */}
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="bg-gradient-to-br from-blue-500/5 via-blue-500/10 to-blue-500/5 p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    {/* Family Group Badge */}
                    {data.familyGroup && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                        <Users size={12} />
                        <span>{data.familyGroup.name}</span>
                        <span className="text-muted-foreground/60">·</span>
                        <span>{data.memberCount} sharing</span>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                      Family Total This Month
                    </p>
                    <p className="text-3xl font-bold tracking-tight">
                      {formatCurrency(Math.abs(netAmount), data.currency)}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "inline-flex items-center gap-1 text-sm font-medium px-2 py-0.5 rounded-full",
                        netAmount >= 0
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-500"
                          : "bg-red-500/15 text-red-600 dark:text-red-500"
                      )}>
                        {netAmount >= 0 ? (
                          <ArrowUp size={14} weight="bold" />
                        ) : (
                          <ArrowDown size={14} weight="bold" />
                        )}
                        {netAmount >= 0 ? "Family Saved" : "Family Overspent"}
                      </span>
                      {data.totalIncome > 0 && (
                        <span className="text-sm text-muted-foreground">
                          {savingsRate}% of income
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="relative size-28">
                    <svg className="size-28 -rotate-90" viewBox="0 0 100 100">
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="8"
                        className="text-background"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={`${spendingRatio * 2.51} 251`}
                        className={cn(
                          spendingRatio > 90 ? "text-red-500" :
                          spendingRatio > 70 ? "text-amber-500" : "text-blue-500"
                        )}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-bold">{Math.round(spendingRatio)}%</span>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">spent</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 divide-x">
                <div className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <div className="size-6 rounded-full bg-emerald-500/10 flex items-center justify-center">
                      <TrendUp size={12} className="text-emerald-600" weight="bold" />
                    </div>
                    <span className="text-xs font-medium">Family Income</span>
                  </div>
                  <p className="text-xl font-semibold text-emerald-600">
                    {formatCurrency(data.totalIncome, data.currency)}
                  </p>
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <div className="size-6 rounded-full bg-red-500/10 flex items-center justify-center">
                      <TrendDown size={12} className="text-red-600" weight="bold" />
                    </div>
                    <span className="text-xs font-medium">Family Expenses</span>
                  </div>
                  <p className="text-xl font-semibold">
                    {formatCurrency(data.totalSpending, data.currency)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Family Spending Categories */}
          {data.categories.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Gauge size={18} className="text-muted-foreground" />
                      Where our money goes
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Tap a category to set or edit spending limit
                    </p>
                  </div>
                  <span className="text-sm text-muted-foreground font-normal">
                    {data.categories.reduce((sum, c) => sum + c.count, 0)} transactions
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ItemGroup>
                  {data.categories.map((category, index) => {
                    const Icon = getCategoryIcon(category.name);
                    const isTop = index === 0;
                    const budget = getBudgetForCategory(category.name);
                    const hasBudget = !!budget;
                    const budgetPercentage = hasBudget
                      ? Math.round((category.amount / budget.amount) * 100)
                      : 0;
                    const isOverBudget = budgetPercentage > 100;
                    const isNearBudget = budgetPercentage > 70 && budgetPercentage <= 100;

                    // Handle category click - open set limit sheet
                    const handleCategoryClick = () => {
                      if (hasBudget) {
                        // Edit existing budget
                        const familyBudget = budgets.find(b => b.category.toLowerCase() === category.name.toLowerCase());
                        setSelectedBudget(familyBudget || null);
                        setSelectedCategory(undefined);
                      } else {
                        // Create new budget for this category
                        setSelectedBudget(null);
                        setSelectedCategory(category.name.toLowerCase());
                      }
                      setSetLimitOpen(true);
                    };

                    return (
                      <div key={category.id}>
                        {index > 0 && <ItemSeparator />}
                        <Item
                          variant="default"
                          size="sm"
                          className={cn(
                            "cursor-pointer hover:bg-muted/50 transition-colors",
                            isOverBudget && "bg-red-500/5 hover:bg-red-500/10",
                            isNearBudget && "bg-amber-500/5 hover:bg-amber-500/10"
                          )}
                          onClick={handleCategoryClick}
                        >
                          <ItemMedia variant="icon">
                            <div className={cn(
                              "size-10 rounded-xl flex items-center justify-center",
                              isOverBudget ? "bg-red-500/10" :
                              isNearBudget ? "bg-amber-500/10" :
                              isTop ? "bg-blue-500/10" : "bg-muted"
                            )}>
                              <Icon
                                size={20}
                                className={cn(
                                  isOverBudget ? "text-red-500" :
                                  isNearBudget ? "text-amber-500" :
                                  isTop ? "text-blue-500" : "text-muted-foreground"
                                )}
                                weight={isTop || isOverBudget ? "fill" : "regular"}
                              />
                            </div>
                          </ItemMedia>
                          <ItemContent>
                            <ItemTitle>
                              {formatCategoryName(category.name)}
                              {isTop && (
                                <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-500 bg-blue-500/10 px-1.5 py-0.5 rounded ml-2">
                                  Top
                                </span>
                              )}
                            </ItemTitle>
                            <ItemDescription>
                              {/* Member contributions */}
                              {category.contributions.length > 0 && (
                                <span className="flex items-center gap-1 flex-wrap">
                                  {category.contributions.slice(0, 3).map((c, i) => (
                                    <span key={c.userId} className="inline-flex items-center gap-0.5">
                                      {i > 0 && <span className="text-muted-foreground/50">·</span>}
                                      <User size={10} />
                                      <span>{c.name}: {c.percentage}%</span>
                                    </span>
                                  ))}
                                  {category.contributions.length > 3 && (
                                    <span className="text-muted-foreground/50">
                                      +{category.contributions.length - 3} more
                                    </span>
                                  )}
                                </span>
                              )}
                            </ItemDescription>
                          </ItemContent>
                          <ItemActions>
                            <div className="text-right">
                              <p className="font-semibold tabular-nums">
                                {formatCurrency(category.amount, data.currency)}
                              </p>
                              {hasBudget ? (
                                <div className="flex items-center gap-2 mt-1">
                                  <Progress
                                    value={Math.min(budgetPercentage, 100)}
                                    className={cn(
                                      "h-1.5 w-16",
                                      isOverBudget ? "[&>div]:bg-red-500" :
                                      isNearBudget ? "[&>div]:bg-amber-500" :
                                      "[&>div]:bg-blue-500"
                                    )}
                                  />
                                  <span className={cn(
                                    "text-xs font-medium tabular-nums",
                                    isOverBudget ? "text-red-500" :
                                    isNearBudget ? "text-amber-500" :
                                    "text-blue-500"
                                  )}>
                                    {budgetPercentage}%
                                  </span>
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground tabular-nums mt-1">
                                  {category.percentage}% of total
                                </p>
                              )}
                            </div>
                          </ItemActions>
                        </Item>
                      </div>
                    );
                  })}
                </ItemGroup>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Member Contributions (40% on desktop) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Family Spending Limits */}
          <SpendingLimitsSection
            budgets={budgets.map(b => ({
              ...b,
              period: "monthly",
            }))}
            currency={data.currency}
            isLoading={isLoadingBudgets}
            variant="family"
            onEditLimit={(budget) => {
              const familyBudget = budgets.find(b => b.id === budget.id);
              setSelectedBudget(familyBudget || null);
              setSelectedCategory(undefined);
              setSetLimitOpen(true);
            }}
          />

          {/* Member Contributions */}
          {data.memberContributions && data.memberContributions.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users size={18} className="text-blue-500" />
                  Member Contributions
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ItemGroup>
                  {data.memberContributions.map((member, index) => (
                    <div key={member.userId}>
                      {index > 0 && <ItemSeparator />}
                      <Item variant="default" size="sm">
                        <ItemMedia variant="icon">
                          <div className={cn(
                            "size-10 rounded-full flex items-center justify-center text-sm font-medium",
                            index === 0 ? "bg-blue-500/10 text-blue-600" : "bg-muted text-muted-foreground"
                          )}>
                            {member.name.charAt(0).toUpperCase()}
                          </div>
                        </ItemMedia>
                        <ItemContent>
                          <ItemTitle>{member.name}</ItemTitle>
                          <ItemDescription>
                            {member.role === "owner" ? "Owner" : member.role === "admin" ? "Admin" : "Member"}
                          </ItemDescription>
                        </ItemContent>
                        <ItemActions>
                          <div className="text-right">
                            <span className="font-semibold tabular-nums">
                              {member.percentage}%
                            </span>
                            <p className="text-xs text-muted-foreground">
                              {formatCompactCurrency(member.amount, data.currency)}
                            </p>
                          </div>
                        </ItemActions>
                      </Item>
                    </div>
                  ))}
                </ItemGroup>
              </CardContent>
            </Card>
          )}

          {/* Privacy Note */}
          <Card className="bg-muted/30">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <ShieldCheck size={20} className="text-muted-foreground flex-shrink-0 mt-0.5" weight="duotone" />
                <div className="text-xs text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">Privacy Protected</p>
                  <p>Only category totals are shared. Your individual transaction details and merchant names remain private.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Family Spending Limit Sheet */}
      <SetSpendingLimitSheet
        open={setLimitOpen}
        onOpenChange={setSetLimitOpen}
        onSuccess={() => {
          fetchFamilyBudgets();
          fetchFamilySpending();
        }}
        existingBudget={selectedBudget ? {
          id: selectedBudget.id,
          category: selectedBudget.category,
          amount: selectedBudget.amount,
          spent: selectedBudget.spent,
          remaining: selectedBudget.remaining,
          percentage: selectedBudget.percentage,
          currency: selectedBudget.currency,
          period: "monthly",
        } : null}
        selectedCategory={selectedCategory}
        defaultCurrency={data?.currency || "BHD"}
        isFamily={true}
      />
    </div>
  );
}
