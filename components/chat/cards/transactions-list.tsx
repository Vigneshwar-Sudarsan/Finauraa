"use client";

import { useState, useEffect } from "react";
import { ArrowDownLeft, ArrowUpRight } from "@phosphor-icons/react";
import { formatCurrency } from "@/lib/utils";
import { formatTransactionDate } from "@/lib/date-utils";

interface TransactionsListProps {
  data?: Record<string, unknown>;
  onAction?: (action: string, data?: Record<string, unknown>) => void;
  disabled?: boolean;
}

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

interface TransactionsData {
  transactions: Transaction[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
}

// Minimal neutral category labels
const CATEGORY_LABELS: Record<string, string> = {
  groceries: "Groceries",
  dining: "Dining",
  transport: "Transport",
  shopping: "Shopping",
  bills: "Bills",
  entertainment: "Entertainment",
  health: "Health",
  coffee: "Coffee",
  fuel: "Fuel",
  other: "Other",
};

export function TransactionsList({ data }: TransactionsListProps) {
  const [transactionsData, setTransactionsData] = useState<TransactionsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const limit = (data?.limit as number) ?? 10;
  const category = data?.category as string | undefined;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const params = new URLSearchParams({ limit: limit.toString() });
        if (category) {
          params.set("category", category);
        }

        const response = await fetch(`/api/finance/transactions?${params.toString()}`);
        if (response.ok) {
          const result = await response.json();
          setTransactionsData(result);
        }
      } catch (error) {
        console.error("Failed to fetch transactions:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [limit, category]);

  if (isLoading) {
    return (
      <div className="w-full max-w-sm rounded-xl border border-border/60 bg-card p-4 space-y-3">
        <div className="h-4 w-28 bg-muted rounded animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-full bg-muted animate-pulse" />
                <div className="space-y-1">
                  <div className="h-3 w-24 bg-muted rounded animate-pulse" />
                  <div className="h-2 w-16 bg-muted rounded animate-pulse" />
                </div>
              </div>
              <div className="h-4 w-16 bg-muted rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const transactions = transactionsData?.transactions ?? [];

  if (transactions.length === 0) {
    return (
      <div className="w-full max-w-sm rounded-xl border border-border/60 bg-card p-4">
        <p className="text-sm text-muted-foreground">
          No transactions found. Transactions will appear here once synced from your bank.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm rounded-xl border border-border/60 bg-card p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Recent Transactions</p>
        <p className="text-xs text-muted-foreground">
          {transactionsData?.pagination.total ?? 0} total
        </p>
      </div>

      {/* Transactions list */}
      <div className="divide-y divide-border/40">
        {transactions.map((tx) => {
          const isCredit = tx.transaction_type === "credit";
          const displayName = tx.merchant_name || tx.description || "Transaction";
          const categoryLabel = CATEGORY_LABELS[tx.category?.toLowerCase()] ?? tx.category ?? "Other";
          const hasLogo = tx.merchant_logo || tx.category_icon;

          return (
            <div key={tx.id} className="flex items-center justify-between py-2.5">
              <div className="flex items-center gap-3">
                {/* Icon */}
                <div
                  className={`size-8 rounded-full flex items-center justify-center overflow-hidden ${
                    isCredit ? "bg-green-500/10" : "bg-muted"
                  }`}
                >
                  {hasLogo ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={tx.merchant_logo || tx.category_icon || ""}
                        alt={tx.merchant_name || tx.category}
                        className="size-5 object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                      {isCredit ? (
                        <ArrowDownLeft size={16} weight="bold" className="hidden text-green-600" />
                      ) : (
                        <ArrowUpRight size={16} weight="bold" className="hidden text-muted-foreground" />
                      )}
                    </>
                  ) : isCredit ? (
                    <ArrowDownLeft size={16} weight="bold" className="text-green-600" />
                  ) : (
                    <ArrowUpRight size={16} weight="bold" className="text-muted-foreground" />
                  )}
                </div>
                {/* Details */}
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate max-w-[160px]">{displayName}</p>
                  <p className="text-xs text-muted-foreground">
                    {categoryLabel} · {formatTransactionDate(tx.transaction_date)}
                  </p>
                </div>
              </div>
              {/* Amount */}
              <p
                className={`text-sm font-medium ${
                  isCredit ? "text-green-600" : "text-foreground"
                }`}
              >
                {isCredit ? "+" : "-"}
                {formatCurrency(tx.amount, tx.currency)}
              </p>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      {transactionsData?.pagination.hasMore && (
        <p className="text-xs text-center text-muted-foreground pt-2">
          Showing {transactions.length} of {transactionsData.pagination.total}
        </p>
      )}
    </div>
  );
}
