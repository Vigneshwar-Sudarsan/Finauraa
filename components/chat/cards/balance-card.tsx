"use client";

import { useState, useEffect } from "react";
import { Money } from "@phosphor-icons/react";
import { formatCurrency } from "@/lib/utils";

interface BalanceCardProps {
  data?: Record<string, unknown>;
}

interface FinanceSummary {
  totalBalance: number;
  accountCount: number;
  currency: string;
}

export function BalanceCard({ data }: BalanceCardProps) {
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/finance/summary");
        if (response.ok) {
          const result = await response.json();
          setSummary({
            totalBalance: result.totalBalance ?? 0,
            accountCount: result.accountCount ?? 0,
            currency: result.currency ?? "BHD",
          });
        }
      } catch (error) {
        console.error("Failed to fetch balance:", error);
      } finally {
        setIsLoading(false);
      }
    };

    // Use passed data if available, otherwise fetch
    if (data?.balance !== undefined) {
      setSummary({
        totalBalance: data.balance as number,
        accountCount: (data.accountCount as number) ?? 1,
        currency: (data.currency as string) ?? "BHD",
      });
      setIsLoading(false);
    } else {
      fetchData();
    }
  }, [data]);

  if (isLoading) {
    return (
      <div className="w-full max-w-sm rounded-xl border border-border/60 bg-card p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="h-3 w-20 bg-muted rounded animate-pulse" />
            <div className="h-7 w-32 bg-muted rounded animate-pulse" />
            <div className="h-3 w-16 bg-muted rounded animate-pulse" />
          </div>
          <div className="rounded-full bg-muted p-2.5">
            <Money size={20} className="text-muted-foreground" />
          </div>
        </div>
      </div>
    );
  }

  const balance = summary?.totalBalance ?? 0;
  const currency = summary?.currency ?? "BHD";
  const accountCount = summary?.accountCount ?? 0;

  return (
    <div className="w-full max-w-sm rounded-xl border border-border/60 bg-card p-4">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground font-medium">
            Total Balance
          </p>
          <p className="text-2xl font-semibold tracking-tight">
            {formatCurrency(balance, currency)}
          </p>
          <p className="text-xs text-muted-foreground">
            {accountCount} account{accountCount !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="rounded-full bg-muted p-2.5">
          <Money size={20} className="text-muted-foreground" />
        </div>
      </div>
    </div>
  );
}
