"use client";

import { useState, useEffect } from "react";
import { ArrowDownLeft, ArrowUpRight } from "@phosphor-icons/react";
import { Separator } from "@/components/ui/separator";

interface Transaction {
  id: string;
  transaction_id: string;
  amount: number;
  currency: string;
  transaction_type: "credit" | "debit";
  description: string;
  merchant_name: string | null;
  category: string;
  transaction_date: string;
}

interface TransactionsListProps {
  accountId?: string | null;
}

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

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-BH", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return date.toLocaleDateString("en-US", { weekday: "short" });

    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  if (isLoading) {
    return (
      <div className="space-y-0">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i}>
            <div className="flex items-center justify-between py-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-muted animate-pulse" />
                <div className="space-y-1">
                  <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                  <div className="h-3 w-20 bg-muted rounded animate-pulse" />
                </div>
              </div>
              <div className="h-4 w-16 bg-muted rounded animate-pulse" />
            </div>
            {i < 5 && <Separator />}
          </div>
        ))}
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        <p className="text-sm">No transactions yet</p>
        <p className="text-xs mt-1">
          Transactions will appear here once synced
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {transactions.map((tx, index) => {
        const isCredit = tx.transaction_type === "credit";
        const displayName = tx.merchant_name || tx.description || "Transaction";
        const categoryLabel =
          CATEGORY_LABELS[tx.category?.toLowerCase()] || tx.category || "Other";

        return (
          <div key={tx.id}>
            <div className="flex items-center justify-between py-4">
              <div className="flex items-center gap-3">
                {/* Icon */}
                <div
                  className={`size-10 rounded-full flex items-center justify-center ${
                    isCredit ? "bg-green-500/10" : "bg-muted"
                  }`}
                >
                  {isCredit ? (
                    <ArrowDownLeft size={20} weight="bold" className="text-green-600" />
                  ) : (
                    <ArrowUpRight size={20} weight="bold" className="text-muted-foreground" />
                  )}
                </div>

                {/* Details */}
                <div className="min-w-0">
                  <p className="font-medium truncate max-w-[180px] sm:max-w-[240px]">
                    {displayName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {categoryLabel} · {formatDate(tx.transaction_date)}
                  </p>
                </div>
              </div>

              {/* Amount */}
              <p
                className={`font-semibold ${
                  isCredit ? "text-green-600" : "text-foreground"
                }`}
              >
                {isCredit ? "+" : "-"}
                {formatCurrency(tx.amount, tx.currency)}
              </p>
            </div>

            {/* Divider */}
            {index < transactions.length - 1 && <Separator />}
          </div>
        );
      })}
    </div>
  );
}
