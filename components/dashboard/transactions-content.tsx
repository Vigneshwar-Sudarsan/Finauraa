"use client";

import { useState, useEffect } from "react";
import { useTransactionFilterStore } from "@/lib/stores/transaction-filter-store";
import { DashboardHeader } from "./dashboard-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { useBankConnection } from "@/hooks/use-bank-connection";
import { useTransactions } from "@/hooks/use-transactions";
import { useBankConnections } from "@/hooks/use-bank-connections";
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
import { cn, formatCurrency } from "@/lib/utils";
import {
  Plus,
  Receipt,
  MagnifyingGlass,
  Funnel,
  Crown,
  Clock,
  Bank,
} from "@phosphor-icons/react";
import Link from "next/link";
import { AddTransactionSheet, TransactionFiltersSheet, type TransactionFilters } from "@/components/spending";
import { format, isToday, isYesterday, isThisWeek, isThisMonth, parseISO, parse } from "date-fns";
import { getCategoryIcon, formatCategoryName } from "@/lib/constants/category-icons";

interface Transaction {
  id: string;
  amount: number;
  currency: string;
  transaction_type: "credit" | "debit";
  category: string;
  category_group?: string;
  category_icon?: string;
  description?: string;
  merchant_name?: string;
  merchant_logo?: string;
  provider_id?: string;
  transaction_date: string;
  is_manual?: boolean;
  account_id?: string;
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

function getDateGroup(dateStr: string): string {
  const date = parseISO(dateStr);
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  if (isThisWeek(date)) return "This Week";
  if (isThisMonth(date)) return "This Month";
  return format(date, "MMMM yyyy");
}

interface GroupedTransactions {
  [key: string]: Transaction[];
}

interface SubscriptionInfo {
  tier: string;
  historyDaysLimit: number | null;
  isLimited: boolean;
}

const PAGE_SIZE = 30;

export function TransactionsContent() {
  const [offset, setOffset] = useState(0);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const { transactions, subscription, pagination, isLoading, mutate } = useTransactions({
    limit: PAGE_SIZE,
    offset: 0,
  });

  const { banks } = useBankConnections();
  const [error, setError] = useState<string | null>(null);
  const [needsConsent, setNeedsConsent] = useState(false);
  const [addTransactionOpen, setAddTransactionOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [pendingFilterApplied, setPendingFilterApplied] = useState(false);

  // Initialize allTransactions with first page
  useEffect(() => {
    if (transactions.length > 0 && offset === 0) {
      setAllTransactions(transactions);
    }
  }, [transactions, offset]);

  // Use accumulated transactions for display
  const displayTransactions = allTransactions.length > 0 ? allTransactions : transactions;

  // Calculate if there are more transactions to load
  const hasMoreToLoad = pagination ? displayTransactions.length < pagination.total : false;

  // Load more transactions
  const loadMore = async () => {
    if (isLoadingMore || !hasMoreToLoad) return;

    setIsLoadingMore(true);
    const newOffset = displayTransactions.length;

    try {
      const response = await fetch(`/api/finance/transactions?limit=${PAGE_SIZE}&offset=${newOffset}`);
      const data = await response.json();

      if (data.transactions && data.transactions.length > 0) {
        setAllTransactions(prev => [...prev, ...data.transactions]);
        setOffset(newOffset);
      }
    } catch (err) {
      console.error("Failed to load more transactions:", err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Reset pagination when mutate is called (e.g., after adding transaction)
  const handleMutate = () => {
    setOffset(0);
    setAllTransactions([]);
    mutate();
  };

  // Bank connection with consent dialog
  const { connectBank, isConnecting, ConsentDialog } = useBankConnection();

  // Zustand store for filters
  const {
    filters,
    searchQuery,
    setFilters,
    setSearchQuery,
    clearFilters: clearStoreFilters,
    consumePendingFilter,
  } = useTransactionFilterStore();

  // Apply pending account filter when banks are loaded
  useEffect(() => {
    if (banks.length > 0 && !pendingFilterApplied) {
      const pendingAccountId = consumePendingFilter();
      if (pendingAccountId) {
        // Find which bank this account belongs to
        const bankWithAccount = banks.find(bank =>
          bank.accounts?.some(acc => acc.id === pendingAccountId)
        );

        setFilters({
          ...filters,
          accountId: pendingAccountId,
          bankId: bankWithAccount?.id || "all",
        });
      }
      setPendingFilterApplied(true);
    }
  }, [banks, pendingFilterApplied, consumePendingFilter, setFilters, filters]);

  // Function to clear filters
  const clearFilters = () => {
    clearStoreFilters();
  };

  // Check if any filters are active
  const hasActiveFilters =
    filters.type !== "all" ||
    filters.category !== "all" ||
    filters.bankId !== "all" ||
    filters.accountId !== "all" ||
    filters.minAmount !== "" ||
    filters.maxAmount !== "";

  // Filter transactions
  const filteredTransactions = displayTransactions.filter((t) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        t.description?.toLowerCase().includes(query) ||
        t.merchant_name?.toLowerCase().includes(query) ||
        t.category.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }

    // Type filter
    if (filters.type !== "all" && t.transaction_type !== filters.type) return false;

    // Category filter
    if (filters.category !== "all" && t.category.toLowerCase() !== filters.category) return false;

    // Bank filter
    if (filters.bankId !== "all") {
      const selectedBank = banks.find((b) => b.id === filters.bankId);
      const bankAccountIds = (selectedBank?.accounts || []).map((a) => a.id);
      if (!t.account_id || !bankAccountIds.includes(t.account_id)) return false;
    }

    // Account filter
    if (filters.accountId !== "all" && t.account_id !== filters.accountId) return false;

    // Amount filters
    const amount = Math.abs(t.amount);
    if (filters.minAmount !== "") {
      const min = parseFloat(filters.minAmount);
      if (!isNaN(min) && amount < min) return false;
    }
    if (filters.maxAmount !== "") {
      const max = parseFloat(filters.maxAmount);
      if (!isNaN(max) && amount > max) return false;
    }

    return true;
  });

  // Group transactions by date
  const groupedTransactions = filteredTransactions.reduce<GroupedTransactions>(
    (groups, transaction) => {
      const group = getDateGroup(transaction.transaction_date);
      if (!groups[group]) {
        groups[group] = [];
      }
      groups[group].push(transaction);
      return groups;
    },
    {}
  );

  const groupOrder = ["Today", "Yesterday", "This Week", "This Month"];
  const sortedGroups = Object.keys(groupedTransactions).sort((a, b) => {
    const aIndex = groupOrder.indexOf(a);
    const bIndex = groupOrder.indexOf(b);
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    // Sort other months chronologically descending (newest first)
    // Parse "MMMM yyyy" format back to date for comparison
    try {
      const dateA = parse(a, "MMMM yyyy", new Date());
      const dateB = parse(b, "MMMM yyyy", new Date());
      return dateB.getTime() - dateA.getTime();
    } catch {
      return b.localeCompare(a);
    }
  });

  const defaultCurrency = displayTransactions[0]?.currency || "BHD";

  return (
    <div className="flex flex-col h-full">
      <DashboardHeader title="Transactions" />

      {/* Error State - Needs Bank Connection */}
      {error && !isLoading && needsConsent && (
        <div className="flex-1 flex items-center justify-center">
          <EmptyState
            icon={<Bank size={28} className="text-muted-foreground" />}
            title="Connect your bank"
            description="Connect your bank account to view and track your transactions."
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
            icon={<Receipt size={28} className="text-muted-foreground" />}
            title="Unable to load transactions"
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
      {!isLoading && !error && displayTransactions.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <EmptyState
            icon={<Receipt size={28} className="text-muted-foreground" />}
            title="No transactions yet"
            description="Add your first transaction to start tracking your spending."
            action={{
              label: "Add Transaction",
              onClick: () => setAddTransactionOpen(true),
            }}
          />
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex-1 overflow-auto p-4 md:p-6">
          <div className="max-w-2xl mx-auto space-y-4">
            {/* Search skeleton */}
            <div className="flex items-center gap-2">
              <div className="flex-1 h-10 bg-muted rounded-md animate-pulse" />
              <div className="size-10 bg-muted rounded-md animate-pulse" />
            </div>

            {/* Transactions card skeleton */}
            <Card>
              <CardHeader className="pb-2">
                <div className="h-5 w-24 bg-muted rounded animate-pulse" />
              </CardHeader>
              <CardContent className="p-0">
                {/* Date header skeleton */}
                <div className="px-4 py-2 bg-muted/50">
                  <div className="h-4 w-16 bg-muted rounded animate-pulse" />
                </div>
                {/* Transaction items skeleton */}
                <ItemGroup>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i}>
                      {i > 1 && <ItemSeparator />}
                      <Item variant="default" size="sm">
                        <ItemMedia variant="icon">
                          <div className="size-10 rounded-xl bg-muted animate-pulse" />
                        </ItemMedia>
                        <ItemContent>
                          <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                          <div className="h-3 w-20 bg-muted rounded animate-pulse mt-1" />
                        </ItemContent>
                        <ItemActions>
                          <div className="text-right space-y-1">
                            <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                            <div className="h-3 w-12 bg-muted rounded animate-pulse ml-auto" />
                          </div>
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

      {/* Transactions List */}
      {!isLoading && !error && displayTransactions.length > 0 && (
        <div className="flex-1 overflow-auto p-4 md:p-6 pb-24 sm:pb-6">
          <div className="max-w-2xl mx-auto space-y-4">
            {/* Search & Filters - Always visible when there are transactions */}
            <div className="flex items-center gap-2">
              <div className="relative w-48 sm:w-64">
                <MagnifyingGlass
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button
                variant={hasActiveFilters ? "secondary" : "outline"}
                size="icon"
                onClick={() => setFiltersOpen(true)}
                className="relative"
              >
                <Funnel size={16} />
                {hasActiveFilters && (
                  <span className="absolute -top-1 -right-1 size-2 bg-primary rounded-full" />
                )}
              </Button>
              {/* Spacer to push Add button to right */}
              <div className="flex-1 hidden sm:block" />
              {/* Desktop Add Button */}
              <Button
                size="sm"
                onClick={() => setAddTransactionOpen(true)}
                className="hidden sm:flex"
              >
                <Plus size={16} />
                Add
              </Button>
            </div>

            {/* No Results - Show when search/filter yields nothing */}
            {filteredTransactions.length === 0 && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <MagnifyingGlass size={32} className="text-muted-foreground mb-3" />
                  <p className="font-medium">No results found</p>
                  <p className="text-sm text-muted-foreground mb-4">Try adjusting your search or filters.</p>
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    Clear Filters
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Transactions when results exist */}
            {filteredTransactions.length > 0 && (
              <>

            {/* Free Tier Limit Banner */}
            {subscription?.isLimited && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <Clock size={18} className="text-amber-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-amber-900 dark:text-amber-100">
                    Showing last {subscription.historyDaysLimit} days of transactions
                  </p>
                </div>
                <Link href="/dashboard/settings/subscription/plans">
                  <Button size="sm" variant="outline" className="shrink-0 gap-1.5 border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10">
                    <Crown size={14} weight="fill" />
                    Upgrade
                  </Button>
                </Link>
              </div>
            )}

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Transactions</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ItemGroup>
                  {sortedGroups.map((group, groupIndex) => (
                    <div key={group}>
                      {/* Date Header */}
                      <div className={cn(
                        "px-4 py-2 bg-muted/50 text-sm font-medium text-muted-foreground",
                        groupIndex > 0 && "border-t"
                      )}>
                        {group}
                      </div>
                      {/* Transactions for this date group */}
                      {groupedTransactions[group]?.map((transaction, index) => {
                        const Icon = getCategoryIcon(transaction.category);
                        const isCredit = transaction.transaction_type === "credit";
                        const hasLogo = transaction.merchant_logo || transaction.category_icon;

                        return (
                          <div key={transaction.id}>
                            {index > 0 && <ItemSeparator />}
                            <Item variant="default" size="sm">
                              <ItemMedia variant="icon">
                                {hasLogo ? (
                                  <div className={cn(
                                    "size-10 rounded-xl flex items-center justify-center overflow-hidden",
                                    isCredit ? "bg-emerald-500/10" : "bg-muted"
                                  )}>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={transaction.merchant_logo || transaction.category_icon}
                                      alt={transaction.merchant_name || transaction.category}
                                      className="size-6 object-contain"
                                      onError={(e) => {
                                        // Fallback to icon if image fails
                                        e.currentTarget.style.display = 'none';
                                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                      }}
                                    />
                                    <Icon
                                      size={20}
                                      className={cn(
                                        "hidden",
                                        isCredit ? "text-emerald-600" : "text-muted-foreground"
                                      )}
                                    />
                                  </div>
                                ) : (
                                  <div className={cn(
                                    "size-10 rounded-xl flex items-center justify-center",
                                    isCredit ? "bg-emerald-500/10" : "bg-muted"
                                  )}>
                                    <Icon
                                      size={20}
                                      className={isCredit ? "text-emerald-600" : "text-muted-foreground"}
                                    />
                                  </div>
                                )}
                              </ItemMedia>
                              <ItemContent>
                                <ItemTitle>
                                  {transaction.merchant_name ||
                                   transaction.description ||
                                   formatCategoryName(transaction.category)}
                                </ItemTitle>
                                <ItemDescription>
                                  {formatCategoryName(transaction.category)}
                                  {transaction.is_manual && (
                                    <span className="ml-2 text-xs bg-muted px-1.5 py-0.5 rounded">
                                      Manual
                                    </span>
                                  )}
                                </ItemDescription>
                              </ItemContent>
                              <ItemActions>
                                <div className="text-right">
                                  <p className={cn(
                                    "font-semibold tabular-nums",
                                    isCredit ? "text-emerald-600" : ""
                                  )}>
                                    {isCredit ? "+" : "-"}
                                    {formatCurrency(Math.abs(transaction.amount), transaction.currency)}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {format(parseISO(transaction.transaction_date), "MMM d")}
                                  </p>
                                </div>
                              </ItemActions>
                            </Item>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </ItemGroup>
              </CardContent>
            </Card>

            {/* Pagination Info & Load More */}
            {pagination && pagination.total > 0 && (
              <div className="flex flex-col items-center gap-3 py-4">
                <p className="text-sm text-muted-foreground">
                  Showing {displayTransactions.length} of {pagination.total} transactions
                </p>
                {hasMoreToLoad && (
                  <Button
                    variant="outline"
                    onClick={loadMore}
                    disabled={isLoadingMore}
                    className="w-full max-w-xs"
                  >
                    {isLoadingMore ? "Loading..." : "Load More"}
                  </Button>
                )}
              </div>
            )}
            </>
            )}
          </div>
        </div>
      )}

      {/* Mobile FAB */}
      <Button
        size="icon"
        onClick={() => setAddTransactionOpen(true)}
        className="fixed bottom-20 right-4 size-14 rounded-full shadow-lg sm:hidden z-50"
      >
        <Plus size={24} weight="bold" />
      </Button>

      {/* Add Transaction Sheet */}
      <AddTransactionSheet
        open={addTransactionOpen}
        onOpenChange={setAddTransactionOpen}
        onSuccess={handleMutate}
        banks={banks}
        defaultCurrency={defaultCurrency}
      />

      {/* Filters Sheet */}
      <TransactionFiltersSheet
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        filters={filters}
        onApplyFilters={setFilters}
        banks={banks}
      />

      {/* Bank Consent Dialog */}
      <ConsentDialog />
    </div>
  );
}
