"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTransactionFilterStore } from "@/lib/stores/transaction-filter-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";
import { useBankConnection } from "@/hooks/use-bank-connection";
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
import { cn } from "@/lib/utils";
import {
  Bank,
  CreditCard,
  Wallet,
  TrendUp,
  TrendDown,
  Copy,
  Check,
  Warning,
  ShoppingCart,
  Car,
  Hamburger,
  Lightning,
  House,
  Heartbeat,
  GameController,
  Airplane,
  DotsThree,
  Money,
  Briefcase,
  CaretRight,
} from "@phosphor-icons/react";

interface Transaction {
  id: string;
  transaction_id: string;
  amount: number;
  currency: string;
  transaction_type: "credit" | "debit";
  description: string;
  merchant_name: string | null;
  category: string | null;
  transaction_date: string;
}

interface Account {
  id: string;
  account_id: string;
  account_type: string;
  account_number: string;
  currency: string;
  balance: number;
  available_balance: number;
  last_synced_at: string | null;
  bank_connections: {
    id: string;
    bank_id: string;
    bank_name: string;
    status: string;
  };
}

interface AccountData {
  account: Account;
  transactions: Transaction[];
  summary: {
    totalSpent: number;
    totalIncome: number;
    spendingByCategory: { category: string; amount: number; percentage: number }[];
    transactionCount: number;
  };
}

function formatCurrency(amount: number, currency: string = "BHD") {
  return new Intl.NumberFormat("en-BH", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

function getAccountIcon(accountType: string) {
  const type = accountType.toLowerCase();
  if (type.includes("credit") || type.includes("card")) {
    return CreditCard;
  }
  if (type.includes("savings")) {
    return Wallet;
  }
  return Bank;
}

// Category icons mapping (consistent with transactions-content.tsx)
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

function getCategoryIcon(categoryName: string | null) {
  if (!categoryName) return DotsThree;
  const key = categoryName.toLowerCase();
  return categoryIcons[key] || DotsThree;
}

export function AccountDetailContent({ accountId }: { accountId: string }) {
  const router = useRouter();
  const setPendingAccountFilter = useTransactionFilterStore((state) => state.setPendingAccountFilter);
  const [data, setData] = useState<AccountData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsConsent, setNeedsConsent] = useState(false);

  // Bank connection with consent dialog
  const { connectBank, isConnecting, ConsentDialog } = useBankConnection();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`/api/finance/accounts/${accountId}`);
        if (!response.ok) {
          // Check if it's a consent/authorization issue
          if (response.status === 403) {
            setNeedsConsent(true);
            setError("Bank connection required");
          } else {
            throw new Error("Failed to fetch account");
          }
          return;
        }
        const accountData = await response.json();
        setData(accountData);
        setNeedsConsent(false);
      } catch (err) {
        console.error("Failed to fetch account:", err);
        setError("Unable to load account details");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [accountId]);

  const handleCopyAccountNumber = () => {
    if (data?.account.account_number) {
      navigator.clipboard.writeText(data.account.account_number);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
            {/* Account Card Skeleton */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="size-12 rounded-full bg-muted animate-pulse" />
                    <div className="space-y-2">
                      <div className="h-5 w-32 bg-muted rounded animate-pulse" />
                      <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                    </div>
                  </div>
                </div>
                <div className="mt-6 space-y-2">
                  <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                  <div className="h-8 w-40 bg-muted rounded animate-pulse" />
                </div>
                <Separator className="my-4" />
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="h-3 w-24 bg-muted rounded animate-pulse" />
                    <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                  </div>
                  <div className="text-right space-y-1">
                    <div className="h-3 w-20 bg-muted rounded animate-pulse" />
                    <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Summary Cards Skeleton */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="size-4 bg-muted rounded animate-pulse" />
                    <div className="h-3 w-16 bg-muted rounded animate-pulse" />
                  </div>
                  <div className="h-6 w-24 bg-muted rounded animate-pulse" />
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="size-4 bg-muted rounded animate-pulse" />
                    <div className="h-3 w-16 bg-muted rounded animate-pulse" />
                  </div>
                  <div className="h-6 w-24 bg-muted rounded animate-pulse" />
                </CardContent>
              </Card>
            </div>

            {/* Recent Transactions Skeleton */}
            <Card>
              <CardHeader className="pb-0">
                <div className="h-5 w-40 bg-muted rounded animate-pulse" />
              </CardHeader>
              <CardContent className="p-0">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i}>
                    {i > 1 && <Separator />}
                    <div className="flex items-center justify-between p-4">
                      <div className="space-y-2">
                        <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                        <div className="h-3 w-24 bg-muted rounded animate-pulse" />
                      </div>
                      <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
    );
  }

  if (error && needsConsent) {
    return (
      <>
        <div className="flex-1 flex items-center justify-center p-4">
          <EmptyState
            icon={<Bank size={28} className="text-muted-foreground" />}
            title="Connect your bank"
            description="Connect your bank account to view account details and transactions."
            action={{
              label: isConnecting ? "Connecting..." : "Connect Bank",
              onClick: connectBank,
              loading: isConnecting,
            }}
          />
        </div>
        <ConsentDialog />
      </>
    );
  }

  if (error || !data) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <EmptyState
          icon={<Warning size={28} className="text-muted-foreground" />}
          title="Account not found"
          description={error || "We couldn't find this account. It may have been disconnected or doesn't exist."}
          action={{
            label: "Back to Accounts",
            onClick: () => router.push("/dashboard/accounts"),
          }}
        />
      </div>
    );
  }

  const { account, transactions, summary } = data;
  const Icon = getAccountIcon(account.account_type);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
      {/* Account Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="size-12 rounded-full bg-muted flex items-center justify-center">
                <Icon size={24} />
              </div>
              <div>
                <p className="font-semibold text-lg">{account.account_type}</p>
                <p className="text-sm text-muted-foreground">
                  {account.bank_connections.bank_name}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <p className="text-sm text-muted-foreground">Current Balance</p>
            <p className="text-3xl font-bold">
              {formatCurrency(account.balance, account.currency)}
            </p>
            {account.available_balance !== account.balance && (
              <p className="text-sm text-muted-foreground mt-1">
                Available: {formatCurrency(account.available_balance, account.currency)}
              </p>
            )}
          </div>

          <Separator className="my-4" />

          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Account Number</p>
              <div className="flex items-center gap-2">
                <p className="font-mono text-sm">****{account.account_number.slice(-4)}</p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6"
                  onClick={handleCopyAccountNumber}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                </Button>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Last Synced</p>
              <p className="text-sm">
                {account.last_synced_at
                  ? new Date(account.last_synced_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "Never"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <TrendDown size={16} className="text-red-500" />
              <span className="text-xs font-medium">Total Spent</span>
            </div>
            <p className="text-lg font-bold text-red-600">
              {formatCurrency(summary.totalSpent, account.currency)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <TrendUp size={16} className="text-green-500" />
              <span className="text-xs font-medium">Total Income</span>
            </div>
            <p className="text-lg font-bold text-green-600">
              {formatCurrency(summary.totalIncome, account.currency)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Spending by Category */}
      {summary.spendingByCategory.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Spending by Category</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {summary.spendingByCategory.slice(0, 5).map((cat) => (
              <div key={cat.category}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm capitalize">{cat.category}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{cat.percentage}%</span>
                    <span className="text-sm font-medium">
                      {formatCurrency(cat.amount, account.currency)}
                    </span>
                  </div>
                </div>
                <Progress value={cat.percentage} className="h-1.5" />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Recent Transactions */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base">
            Recent Transactions ({summary.transactionCount})
          </CardTitle>
          {transactions.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setPendingAccountFilter(accountId);
                router.push("/dashboard/transactions");
              }}
              className="text-xs text-muted-foreground hover:text-foreground -mr-2"
            >
              View All
              <CaretRight size={14} className="ml-1" />
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {transactions.length === 0 ? (
            <div className="py-8 px-4 text-center">
              <p className="text-sm text-muted-foreground">No transactions yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Transactions will appear here once synced
              </p>
            </div>
          ) : (
            <ItemGroup>
              {transactions.slice(0, 20).map((txn, index) => {
                const TxnIcon = getCategoryIcon(txn.category);
                const isCredit = txn.transaction_type === "credit";

                return (
                  <div key={txn.id}>
                    {index > 0 && <ItemSeparator />}
                    <Item variant="default" size="sm">
                      <ItemMedia variant="icon">
                        <div
                          className={cn(
                            "size-10 rounded-xl flex items-center justify-center",
                            isCredit ? "bg-emerald-500/10" : "bg-muted"
                          )}
                        >
                          <TxnIcon
                            size={20}
                            className={isCredit ? "text-emerald-600" : "text-muted-foreground"}
                          />
                        </div>
                      </ItemMedia>
                      <ItemContent>
                        <ItemTitle className="truncate">
                          {txn.merchant_name || txn.description || "Transaction"}
                        </ItemTitle>
                        <ItemDescription>
                          {txn.category && `${txn.category} · `}
                          {new Date(txn.transaction_date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </ItemDescription>
                      </ItemContent>
                      <ItemActions>
                        <p
                          className={cn(
                            "font-semibold tabular-nums",
                            isCredit ? "text-emerald-600" : ""
                          )}
                        >
                          {isCredit ? "+" : "-"}
                          {formatCurrency(txn.amount, txn.currency)}
                        </p>
                      </ItemActions>
                    </Item>
                  </div>
                );
              })}
            </ItemGroup>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
