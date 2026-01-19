"use client";

import { useState, useEffect, useCallback } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { MobileNavButton } from "@/components/mobile-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Money,
  Briefcase,
  Bank,
  Plus,
  Receipt,
  MagnifyingGlass,
  ArrowDown,
  ArrowUp,
  Funnel,
} from "@phosphor-icons/react";
import { AddTransactionSheet } from "@/components/spending";
import { format, isToday, isYesterday, isThisWeek, isThisMonth, parseISO } from "date-fns";

interface Transaction {
  id: string;
  amount: number;
  currency: string;
  transaction_type: "credit" | "debit";
  category: string;
  description?: string;
  merchant_name?: string;
  transaction_date: string;
  is_manual: boolean;
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
  income: Money,
  transfer: Bank,
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

function formatCategoryName(name: string) {
  return name
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
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

export function TransactionsContent() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [banks, setBanks] = useState<BankConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addTransactionOpen, setAddTransactionOpen] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "credit" | "debit">("all");
  const [showFilters, setShowFilters] = useState(false);

  const fetchTransactions = useCallback(async () => {
    try {
      const response = await fetch("/api/finance/transactions");
      if (!response.ok) throw new Error("Failed to fetch transactions");
      const data = await response.json();
      setTransactions(data.transactions || []);
    } catch (err) {
      console.error("Failed to fetch transactions:", err);
      setError("Unable to load transactions");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchBanks = useCallback(async () => {
    try {
      const response = await fetch("/api/finance/connections");
      if (!response.ok) throw new Error("Failed to fetch connections");
      const { connections } = await response.json();
      setBanks(connections || []);
    } catch (err) {
      console.error("Failed to fetch banks:", err);
    }
  }, []);

  useEffect(() => {
    fetchTransactions();
    fetchBanks();
  }, [fetchTransactions, fetchBanks]);

  // Filter transactions
  const filteredTransactions = transactions.filter((t) => {
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
    if (typeFilter !== "all" && t.transaction_type !== typeFilter) return false;

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
    return b.localeCompare(a); // Sort other months descending
  });

  const defaultCurrency = transactions[0]?.currency || "BHD";

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="!self-center h-4" />
          <h1 className="font-semibold">Transactions</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAddTransactionOpen(true)}
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Add</span>
          </Button>
          <MobileNavButton />
        </div>
      </header>

      {/* Search & Filters */}
      <div className="border-b px-4 py-3 space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <MagnifyingGlass
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            variant={showFilters ? "secondary" : "outline"}
            size="icon"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Funnel size={16} />
          </Button>
        </div>

        {showFilters && (
          <div className="flex items-center gap-2">
            <Select
              value={typeFilter}
              onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="debit">Expenses</SelectItem>
                <SelectItem value="credit">Income</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Error State */}
      {error && !isLoading && (
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
      {!isLoading && !error && transactions.length === 0 && (
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
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4 p-4">
                <div className="size-10 rounded-xl bg-muted animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                  <div className="h-3 w-24 bg-muted rounded animate-pulse" />
                </div>
                <div className="h-5 w-20 bg-muted rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transactions List */}
      {!isLoading && !error && filteredTransactions.length > 0 && (
        <div className="flex-1 overflow-auto p-4 md:p-6">
          <div className="max-w-2xl mx-auto space-y-6">
            {sortedGroups.map((group, groupIndex) => (
              <section key={group} className="space-y-3">
                <h2 className="text-sm font-medium text-muted-foreground px-1">
                  {group}
                </h2>
                <Card>
                  <CardContent className="p-2">
                    <ItemGroup>
                      {groupedTransactions[group].map((transaction, index) => {
                        const Icon = getCategoryIcon(transaction.category);
                        const isCredit = transaction.transaction_type === "credit";

                        return (
                          <div key={transaction.id}>
                            {index > 0 && <ItemSeparator />}
                            <Item variant="default" size="sm">
                              <ItemMedia variant="icon">
                                <div className={cn(
                                  "size-10 rounded-xl flex items-center justify-center",
                                  isCredit ? "bg-emerald-500/10" : "bg-muted"
                                )}>
                                  <Icon
                                    size={20}
                                    className={isCredit ? "text-emerald-600" : "text-muted-foreground"}
                                  />
                                </div>
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
                    </ItemGroup>
                  </CardContent>
                </Card>
              </section>
            ))}
          </div>
        </div>
      )}

      {/* No Results */}
      {!isLoading && !error && transactions.length > 0 && filteredTransactions.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <EmptyState
            icon={<MagnifyingGlass size={28} className="text-muted-foreground" />}
            title="No results found"
            description="Try adjusting your search or filters."
            action={{
              label: "Clear Filters",
              onClick: () => {
                setSearchQuery("");
                setTypeFilter("all");
              },
              variant: "outline",
            }}
          />
        </div>
      )}

      {/* Add Transaction Sheet */}
      <AddTransactionSheet
        open={addTransactionOpen}
        onOpenChange={setAddTransactionOpen}
        onSuccess={fetchTransactions}
        banks={banks}
        defaultCurrency={defaultCurrency}
      />
    </div>
  );
}
