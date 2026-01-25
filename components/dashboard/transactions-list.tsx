"use client";

import { useState, useEffect, memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { formatTransactionDate } from "@/lib/date-utils";
import { getCategoryIcon, getCategoryLabel } from "@/lib/constants/category-icons";

interface Transaction {
  id: string;
  transaction_id: string;
  amount: number;
  currency: string;
  transaction_type: "credit" | "debit";
  description: string;
  merchant_name: string | null;
  merchant_logo?: string | null;
  category: string;
  category_group?: string | null;
  category_icon?: string | null;
  provider_id?: string | null;
  transaction_date: string;
}

// Memoized transaction item to prevent re-renders
const TransactionItem = memo(function TransactionItem({
  tx,
  showSeparator,
}: {
  tx: Transaction;
  showSeparator: boolean;
}) {
  const isCredit = tx.transaction_type === "credit";
  const displayName = tx.merchant_name || tx.description || "Transaction";
  const categoryLabel = getCategoryLabel(tx.category || "other");
  const Icon = getCategoryIcon(tx.category);
  const hasLogo = tx.merchant_logo || tx.category_icon;

  return (
    <>
      {showSeparator && <ItemSeparator />}
      <Item variant="default" size="sm">
        <ItemMedia variant="icon">
          {hasLogo ? (
            <div
              className={cn(
                "size-10 rounded-xl flex items-center justify-center overflow-hidden",
                isCredit ? "bg-emerald-500/10" : "bg-muted"
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={tx.merchant_logo || tx.category_icon || ""}
                alt={tx.merchant_name || tx.category}
                className="size-6 object-contain"
                onError={(e) => {
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
            <div
              className={cn(
                "size-10 rounded-xl flex items-center justify-center",
                isCredit ? "bg-emerald-500/10" : "bg-muted"
              )}
            >
              <Icon
                size={20}
                className={isCredit ? "text-emerald-600" : "text-muted-foreground"}
              />
            </div>
          )}
        </ItemMedia>
        <ItemContent>
          <ItemTitle className="truncate max-w-[180px] sm:max-w-[240px]">
            {displayName}
          </ItemTitle>
          <ItemDescription>
            {categoryLabel} · {formatTransactionDate(tx.transaction_date)}
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
            {formatCurrency(tx.amount, tx.currency)}
          </p>
        </ItemActions>
      </Item>
    </>
  );
});

interface TransactionsListProps {
  accountId?: string | null;
}

export function TransactionsList({ accountId }: TransactionsListProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTransactions = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({ limit: "10" });
        if (accountId) {
          params.set("account_id", accountId);
        }

        const response = await fetch(`/api/finance/transactions?${params.toString()}`);
        // Silently handle 403 - parent component handles consent flow
        if (response.status === 403) {
          setTransactions([]);
          return;
        }
        if (response.ok) {
          const data = await response.json();
          setTransactions(data.transactions ?? []);
        }
      } catch (error) {
        console.error("Failed to fetch transactions:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTransactions();
  }, [accountId]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
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
                    <div className="h-4 w-16 bg-muted rounded animate-pulse" />
                  </ItemActions>
                </Item>
              </div>
            ))}
          </ItemGroup>
        </CardContent>
      </Card>
    );
  }

  if (transactions.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-6 text-center text-muted-foreground">
            <p className="text-sm">No transactions yet</p>
            <p className="text-xs mt-1">
              Transactions will appear here once synced
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Recent Transactions</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ItemGroup>
          {transactions.map((tx, index) => (
            <TransactionItem key={tx.id} tx={tx} showSeparator={index > 0} />
          ))}
        </ItemGroup>
      </CardContent>
    </Card>
  );
}
