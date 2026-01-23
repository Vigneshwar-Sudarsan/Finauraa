"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { DashboardHeader } from "./dashboard-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
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
import { useBankConnection } from "@/hooks/use-bank-connection";
import { useFeatureAccess } from "@/hooks/use-feature-access";
import { cn, formatCurrency, formatCompactCurrency } from "@/lib/utils";
import {
  TrendUp,
  TrendDown,
  Bank,
  ChartPieSlice,
  ArrowUp,
  ArrowDown,
  Storefront,
  Plus,
  Gauge,
  Users,
  Lock,
  User,
} from "@phosphor-icons/react";
import { getCategoryIcon, formatCategoryName } from "@/lib/constants/category-icons";
import {
  AddTransactionSheet,
  SetSpendingLimitSheet,
  SpendingLimitsSection,
} from "@/components/spending";
import { FamilySpendingContent } from "./family-spending-content";

interface SpendingCategory {
  id: string;
  name: string;
  amount: number;
  count: number;
  percentage: number;
}

interface IncomeSource {
  type: string;
  amount: number;
  count: number;
  percentage: number;
}

interface SpendingData {
  totalSpending: number;
  totalIncome: number;
  currency: string;
  categories: SpendingCategory[];
  incomeSources?: IncomeSource[];
  topMerchants?: { name: string; amount: number; count: number }[];
  period?: { from: string; to: string };
  fallback?: boolean;
}

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

interface BankConnection {
  id: string;
  bank_name: string;
  accounts: {
    id: string;
    account_number?: string;
    account_type?: string;
    currency: string;
  }[];
}

// Category icons and formatting now imported from @/lib/constants/category-icons

export function SpendingContent() {
  const router = useRouter();
  const [data, setData] = useState<SpendingData | null>(null);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [banks, setBanks] = useState<BankConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingBudgets, setIsLoadingBudgets] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsConsent, setNeedsConsent] = useState(false);
  const [activeTab, setActiveTab] = useState<"my" | "family">("my");
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch by only rendering dynamic content after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Feature access for Pro/Family features
  const { canAccessFamilyFeatures, isLoading: featureLoading } = useFeatureAccess();

  // Bank connection with consent dialog
  const { connectBank, isConnecting, ConsentDialog } = useBankConnection();

  // Sheet states
  const [addTransactionOpen, setAddTransactionOpen] = useState(false);
  const [setLimitOpen, setSetLimitOpen] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [familyRefreshTrigger, setFamilyRefreshTrigger] = useState(0);

  // Handle tab change - redirect to upgrade if not Pro
  const handleTabChange = (value: string) => {
    // Don't redirect while feature access is still loading
    if (value === "family" && !featureLoading && !canAccessFamilyFeatures) {
      router.push("/dashboard/settings/subscription/plans");
      return;
    }
    setActiveTab(value as "my" | "family");
  };

  const fetchSpendingData = useCallback(async () => {
    try {
      const response = await fetch("/api/finance/insights/spending");
      if (!response.ok) {
        // Check if it's a consent/authorization issue
        if (response.status === 403) {
          setNeedsConsent(true);
          setError("Bank connection required");
        } else {
          throw new Error("Failed to fetch spending data");
        }
        return;
      }
      const spendingData = await response.json();
      setData(spendingData);
      setNeedsConsent(false);
    } catch (err) {
      console.error("Failed to fetch spending data:", err);
      setError("Unable to load spending data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchBudgets = useCallback(async () => {
    try {
      const response = await fetch("/api/finance/budgets");
      // Silently handle 403 - main fetchSpendingData handles consent flow
      if (response.status === 403) return;
      if (!response.ok) throw new Error("Failed to fetch budgets");
      const { budgets: budgetsData } = await response.json();
      setBudgets(budgetsData || []);
    } catch (err) {
      console.error("Failed to fetch budgets:", err);
    } finally {
      setIsLoadingBudgets(false);
    }
  }, []);

  const fetchBanks = useCallback(async () => {
    try {
      const response = await fetch("/api/finance/connections");
      // Silently handle 403 - main fetchSpendingData handles consent flow
      if (response.status === 403) return;
      if (!response.ok) throw new Error("Failed to fetch connections");
      const { connections } = await response.json();
      setBanks(connections || []);
    } catch (err) {
      console.error("Failed to fetch banks:", err);
    }
  }, []);

  useEffect(() => {
    // Parallelize all three API calls for better performance
    Promise.all([fetchSpendingData(), fetchBudgets(), fetchBanks()]);
  }, [fetchSpendingData, fetchBudgets, fetchBanks]);

  const handleRefreshAll = () => {
    if (activeTab === "family") {
      // Trigger family spending refresh
      setFamilyRefreshTrigger((prev) => prev + 1);
    } else {
      fetchSpendingData();
      fetchBudgets();
    }
  };

  // Budget helpers
  const getBudgetForCategory = (categoryName: string): Budget | undefined => {
    return budgets.find(
      (b) => b.category.toLowerCase() === categoryName.toLowerCase()
    );
  };

  const handleCategoryClick = (category: SpendingCategory) => {
    const existingBudget = getBudgetForCategory(category.name);
    if (existingBudget) {
      setSelectedBudget(existingBudget);
      setSelectedCategory(undefined);
    } else {
      setSelectedBudget(null);
      setSelectedCategory(category.name.toLowerCase());
    }
    setSetLimitOpen(true);
  };

  const netAmount = data ? data.totalIncome - data.totalSpending : 0;
  const savingsRate = data && data.totalIncome > 0
    ? Math.round((netAmount / data.totalIncome) * 100)
    : 0;

  // Calculate spending ratio for the visual ring
  const spendingRatio = data && data.totalIncome > 0
    ? Math.min((data.totalSpending / data.totalIncome) * 100, 100)
    : 0;

  return (
    <div className="flex flex-col h-full">
      <DashboardHeader title="Spending" />

      {/* Tab Navigation Row - Full width above content */}
      <div className="px-4 md:px-6 pt-4 md:pt-6 max-w-4xl mx-auto w-full">
        <div className="flex items-center justify-between gap-4">
          {/* Tabs - only render after mount to prevent hydration mismatch */}
          {mounted ? (
            <Tabs value={activeTab} onValueChange={handleTabChange}>
              <TabsList>
                <TabsTrigger value="my" className="gap-1.5">
                  <User size={14} weight={activeTab === "my" ? "fill" : "regular"} />
                  My
                </TabsTrigger>
                <TabsTrigger
                  value="family"
                  className={cn(
                    "gap-1.5",
                    !canAccessFamilyFeatures && !featureLoading && "opacity-70"
                  )}
                >
                  {canAccessFamilyFeatures || featureLoading ? (
                    <Users size={14} weight={activeTab === "family" ? "fill" : "regular"} />
                  ) : (
                    <Lock size={14} />
                  )}
                  Family
                </TabsTrigger>
              </TabsList>
            </Tabs>
          ) : (
            /* Static placeholder during SSR to prevent hydration mismatch */
            <div className="w-[140px] h-9 bg-muted rounded-lg" />
          )}

          {/* Add Transaction Button */}
          <Button
            size="sm"
            onClick={() => setAddTransactionOpen(true)}
            className="hidden sm:flex"
          >
            <Plus size={16} />
            Add Transaction
          </Button>
        </div>
      </div>

      {/* Family Tab Content */}
      {activeTab === "family" && (
        featureLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="size-2 bg-foreground/40 rounded-full animate-pulse" />
              <div className="size-2 bg-foreground/40 rounded-full animate-pulse" style={{ animationDelay: "150ms" }} />
              <div className="size-2 bg-foreground/40 rounded-full animate-pulse" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        ) : canAccessFamilyFeatures ? (
          <div className="flex-1 overflow-auto pb-24 sm:pb-0">
            <FamilySpendingContent refreshTrigger={familyRefreshTrigger} />
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
            description="Connect your bank account to view your spending insights and budgets."
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
            icon={<ChartPieSlice size={28} className="text-muted-foreground" />}
            title="Unable to load spending"
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
      {!isLoading && !error && data && data.totalSpending === 0 && data.totalIncome === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <EmptyState
            icon={<ChartPieSlice size={28} className="text-muted-foreground" />}
            title="No spending data yet"
            description="Connect your bank accounts and make some transactions to see your spending insights here."
            action={{
              label: isConnecting ? "Connecting..." : "Connect Bank",
              onClick: connectBank,
              loading: isConnecting,
            }}
          />
        </div>
      )}

      {/* Main Content */}
      {(isLoading || (data && !error && (data.totalSpending > 0 || data.totalIncome > 0))) && (
      <div className="flex-1 overflow-auto pb-24 sm:pb-0">
        <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">

          {/* Loading State */}
          {isLoading && (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Left Column */}
              <div className="lg:col-span-3 space-y-6">
                {/* Hero Card Skeleton */}
                <Card className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 p-6">
                      <div className="flex items-center justify-between">
                        <div className="space-y-3">
                          <div className="h-3 w-24 bg-muted rounded animate-pulse" />
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
                          <div className="h-3 w-14 bg-muted rounded animate-pulse" />
                        </div>
                        <div className="h-6 w-24 bg-muted rounded animate-pulse" />
                      </div>
                      <div className="p-4 space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="size-6 rounded-full bg-muted animate-pulse" />
                          <div className="h-3 w-16 bg-muted rounded animate-pulse" />
                        </div>
                        <div className="h-6 w-24 bg-muted rounded animate-pulse" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Categories Section Skeleton */}
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="size-5 bg-muted rounded animate-pulse" />
                        <div className="h-5 w-40 bg-muted rounded animate-pulse" />
                      </div>
                      <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ItemGroup>
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i}>
                          {i > 1 && <ItemSeparator />}
                          <Item variant="default" size="sm">
                            <ItemMedia variant="icon">
                              <div className="size-10 rounded-xl bg-muted animate-pulse" />
                            </ItemMedia>
                            <ItemContent>
                              <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                              <div className="h-3 w-32 bg-muted rounded animate-pulse mt-1" />
                            </ItemContent>
                            <ItemActions>
                              <div className="text-right space-y-1">
                                <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                                <div className="h-3 w-16 bg-muted rounded animate-pulse ml-auto" />
                              </div>
                            </ItemActions>
                          </Item>
                        </div>
                      ))}
                    </ItemGroup>
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
                    <ItemGroup>
                      {[1, 2].map((i) => (
                        <div key={i}>
                          {i > 1 && <ItemSeparator />}
                          <Item variant="default" size="sm">
                            <ItemMedia variant="icon">
                              <div className="size-10 rounded-xl bg-muted animate-pulse" />
                            </ItemMedia>
                            <ItemContent>
                              <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                              <div className="h-3 w-32 bg-muted rounded animate-pulse mt-1" />
                            </ItemContent>
                            <ItemActions>
                              <div className="text-right space-y-1">
                                <div className="h-4 w-16 bg-muted rounded animate-pulse" />
                                <div className="h-1.5 w-16 bg-muted rounded-full animate-pulse" />
                              </div>
                            </ItemActions>
                          </Item>
                        </div>
                      ))}
                    </ItemGroup>
                  </CardContent>
                </Card>

                {/* Income Sources Skeleton */}
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <div className="size-5 bg-muted rounded animate-pulse" />
                      <div className="h-5 w-28 bg-muted rounded animate-pulse" />
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ItemGroup>
                      {[1, 2].map((i) => (
                        <div key={i}>
                          {i > 1 && <ItemSeparator />}
                          <Item variant="default" size="sm">
                            <ItemMedia variant="icon">
                              <div className="size-10 rounded-xl bg-muted animate-pulse" />
                            </ItemMedia>
                            <ItemContent>
                              <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                              <div className="h-3 w-16 bg-muted rounded animate-pulse mt-1" />
                            </ItemContent>
                            <ItemActions>
                              <div className="h-4 w-16 bg-muted rounded animate-pulse" />
                            </ItemActions>
                          </Item>
                        </div>
                      ))}
                    </ItemGroup>
                  </CardContent>
                </Card>

                {/* Top Merchants Skeleton */}
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <div className="size-5 bg-muted rounded animate-pulse" />
                      <div className="h-5 w-28 bg-muted rounded animate-pulse" />
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ItemGroup>
                      {[1, 2, 3].map((i) => (
                        <div key={i}>
                          {i > 1 && <ItemSeparator />}
                          <Item variant="default" size="sm">
                            <ItemMedia variant="icon">
                              <div className="size-10 rounded-xl bg-muted animate-pulse" />
                            </ItemMedia>
                            <ItemContent>
                              <div className="h-4 w-28 bg-muted rounded animate-pulse" />
                              <div className="h-3 w-14 bg-muted rounded animate-pulse mt-1" />
                            </ItemContent>
                            <ItemActions>
                              <div className="h-4 w-16 bg-muted rounded animate-pulse" />
                            </ItemActions>
                          </Item>
                        </div>
                      ))}
                    </ItemGroup>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Data Loaded */}
          {data && !isLoading && (data.totalSpending > 0 || data.totalIncome > 0) && (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Left Column - Main Content (60% on desktop) */}
              <div className="lg:col-span-3 space-y-6">
                {/* Hero Card - Financial Overview */}
                <Card className="overflow-hidden">
                  <CardContent className="p-0">
                    {/* Gradient Header */}
                    <div className="bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 p-6">
                      <div className="flex items-center justify-between">
                        {/* Left Side - Main Balance Info */}
                        <div className="space-y-1">
                          {data.period && (
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                              {new Date(data.period.from).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })}{" "}
                              -{" "}
                              {new Date(data.period.to).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })}
                            </p>
                          )}
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
                              {netAmount >= 0 ? "Saved" : "Overspent"}
                            </span>
                            {data.totalIncome > 0 && (
                              <span className="text-sm text-muted-foreground">
                                {savingsRate}% of income
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Right Side - Spending Ring */}
                        <div className="relative size-28">
                          <svg className="size-28 -rotate-90" viewBox="0 0 100 100">
                            {/* Background ring */}
                            <circle
                              cx="50"
                              cy="50"
                              r="40"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="8"
                              className="text-background"
                            />
                            {/* Progress ring */}
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
                                spendingRatio > 70 ? "text-amber-500" : "text-emerald-500"
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

                    {/* Income/Expense Summary */}
                    <div className="grid grid-cols-2 divide-x">
                      <div className="p-4">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                          <div className="size-6 rounded-full bg-emerald-500/10 flex items-center justify-center">
                            <TrendUp size={12} className="text-emerald-600" weight="bold" />
                          </div>
                          <span className="text-xs font-medium">Income</span>
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
                          <span className="text-xs font-medium">Expenses</span>
                        </div>
                        <p className="text-xl font-semibold">
                          {formatCurrency(data.totalSpending, data.currency)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Spending Categories */}
                {data.categories.length > 0 && (
                  <section className="space-y-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Gauge size={18} className="text-muted-foreground" />
                            Where your money goes
                          </CardTitle>
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

                            return (
                              <div key={category.id}>
                                {index > 0 && <ItemSeparator />}
                                <Item
                                  variant="default"
                                  size="sm"
                                  className={cn(
                                    "cursor-pointer hover:bg-muted/50 transition-colors",
                                    isOverBudget && "bg-red-500/5",
                                    isNearBudget && "bg-amber-500/5"
                                  )}
                                  onClick={() => handleCategoryClick(category)}
                                >
                                  <ItemMedia variant="icon">
                                    <div className={cn(
                                      "size-10 rounded-xl flex items-center justify-center",
                                      isOverBudget ? "bg-red-500/10" :
                                      isNearBudget ? "bg-amber-500/10" :
                                      isTop ? "bg-primary/10" : "bg-muted"
                                    )}>
                                      <Icon
                                        size={20}
                                        className={cn(
                                          isOverBudget ? "text-red-500" :
                                          isNearBudget ? "text-amber-500" :
                                          isTop ? "text-primary" : "text-muted-foreground"
                                        )}
                                        weight={isTop || isOverBudget ? "fill" : "regular"}
                                      />
                                    </div>
                                  </ItemMedia>
                                  <ItemContent>
                                    <ItemTitle>
                                      {formatCategoryName(category.name)}
                                      {isTop && (
                                        <span className="text-[10px] font-semibold uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded ml-2">
                                          Top
                                        </span>
                                      )}
                                    </ItemTitle>
                                    <ItemDescription>
                                      {category.count} transaction{category.count !== 1 ? "s" : ""}
                                      {hasBudget && (
                                        <span className={cn(
                                          "ml-2",
                                          isOverBudget ? "text-red-500" : ""
                                        )}>
                                          · {isOverBudget
                                            ? `${formatCompactCurrency(category.amount - budget.amount, data.currency)} over budget`
                                            : `${formatCompactCurrency(budget.amount - category.amount, data.currency)} left`}
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
                                              "[&>div]:bg-emerald-500"
                                            )}
                                          />
                                          <span className={cn(
                                            "text-xs font-medium tabular-nums",
                                            isOverBudget ? "text-red-500" :
                                            isNearBudget ? "text-amber-500" :
                                            "text-emerald-500"
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

                    <p className="text-xs text-center text-muted-foreground">
                      Tap a category to set or edit spending limit
                    </p>
                  </section>
                )}

              </div>

              {/* Right Column - Sidebar Content (40% on desktop) */}
              <div className="lg:col-span-2 space-y-6">
                {/* Spending Limits */}
                <SpendingLimitsSection
                  budgets={budgets}
                  currency={data.currency}
                  isLoading={isLoadingBudgets}
                  variant="personal"
                  onAddLimit={() => {
                    setSelectedBudget(null);
                    setSelectedCategory(undefined);
                    setSetLimitOpen(true);
                  }}
                  onEditLimit={(budget) => {
                    setSelectedBudget(budget);
                    setSelectedCategory(undefined);
                    setSetLimitOpen(true);
                  }}
                />

                {/* Income Sources */}
                {data.totalIncome > 0 && data.incomeSources && data.incomeSources.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <TrendUp size={18} className="text-emerald-500" />
                        Income Sources
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <ItemGroup>
                        {data.incomeSources.map((source, index) => {
                          const Icon = getCategoryIcon(source.type);

                          return (
                            <div key={source.type}>
                              {index > 0 && <ItemSeparator />}
                              <Item variant="default" size="sm">
                                <ItemMedia variant="icon">
                                  <div className="size-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                                    <Icon size={20} className="text-emerald-600" />
                                  </div>
                                </ItemMedia>
                                <ItemContent>
                                  <ItemTitle>{formatCategoryName(source.type)}</ItemTitle>
                                  <ItemDescription>
                                    {source.count} deposit{source.count !== 1 ? "s" : ""}
                                  </ItemDescription>
                                </ItemContent>
                                <ItemActions>
                                  <span className="font-semibold text-emerald-600 tabular-nums">
                                    +{formatCompactCurrency(source.amount, data.currency)}
                                  </span>
                                </ItemActions>
                              </Item>
                            </div>
                          );
                        })}
                      </ItemGroup>
                    </CardContent>
                  </Card>
                )}

                {/* Top Merchants */}
                {data.topMerchants && data.topMerchants.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Storefront size={18} className="text-muted-foreground" />
                        Top Merchants
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <ItemGroup>
                        {data.topMerchants.slice(0, 5).map((merchant, index) => (
                          <div key={merchant.name}>
                            {index > 0 && <ItemSeparator />}
                            <Item variant="default" size="sm">
                              <ItemMedia variant="icon">
                                <div className={cn(
                                  "size-10 rounded-xl flex items-center justify-center text-sm font-bold",
                                  index === 0 ? "bg-amber-500/10 text-amber-600" :
                                  index === 1 ? "bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300" :
                                  index === 2 ? "bg-orange-500/10 text-orange-600" :
                                  "bg-muted text-muted-foreground"
                                )}>
                                  {index + 1}
                                </div>
                              </ItemMedia>
                              <ItemContent>
                                <ItemTitle className="truncate">{merchant.name}</ItemTitle>
                                <ItemDescription>
                                  {merchant.count} visit{merchant.count !== 1 ? "s" : ""}
                                </ItemDescription>
                              </ItemContent>
                              <ItemActions>
                                <span className="font-semibold tabular-nums">
                                  {formatCompactCurrency(merchant.amount, data.currency)}
                                </span>
                              </ItemActions>
                            </Item>
                          </div>
                        ))}
                      </ItemGroup>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      )}
        </>
      )}

      {/* Mobile FAB */}
      <Button
        size="icon"
        onClick={() => setAddTransactionOpen(true)}
        className="fixed bottom-20 right-4 size-14 rounded-full shadow-lg sm:hidden z-50"
      >
        <Plus size={24} weight="bold" />
      </Button>

      {/* Sheet Modals */}
      <AddTransactionSheet
        open={addTransactionOpen}
        onOpenChange={setAddTransactionOpen}
        onSuccess={handleRefreshAll}
        banks={banks}
        defaultCurrency={data?.currency || "BHD"}
        isFamily={activeTab === "family"}
      />

      <SetSpendingLimitSheet
        open={setLimitOpen}
        onOpenChange={setSetLimitOpen}
        onSuccess={() => {
          fetchBudgets();
          fetchSpendingData();
        }}
        existingBudget={selectedBudget}
        selectedCategory={selectedCategory}
        defaultCurrency={data?.currency || "BHD"}
        isFamily={activeTab === "family"}
      />

      {/* Bank Consent Dialog */}
      <ConsentDialog />
    </div>
  );
}
