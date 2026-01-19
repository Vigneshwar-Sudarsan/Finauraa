"use client";

import { Wallet } from "lucide-react";

interface BalanceCardProps {
  data?: Record<string, unknown>;
}

export function BalanceCard({ data }: BalanceCardProps) {
  const balance = (data?.balance as number) ?? 0;
  const currency = (data?.currency as string) ?? "BHD";
  const accountCount = (data?.accountCount as number) ?? 1;
  const change = data?.change as number | undefined;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-BH", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 3,
    }).format(amount);
  };

  return (
    <div className="w-full max-w-sm rounded-xl border border-border/60 bg-card p-4">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground font-medium">
            Total Balance
          </p>
          <p className="text-2xl font-semibold tracking-tight">
            {formatCurrency(balance)}
          </p>
          <p className="text-xs text-muted-foreground">
            {accountCount} account{accountCount !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="rounded-full bg-muted p-2.5">
          <Wallet className="size-5 text-muted-foreground" />
        </div>
      </div>
      {change !== undefined && (
        <p className="text-xs mt-3 text-muted-foreground">
          {change >= 0 ? "+" : ""}
          {change.toFixed(1)}% from last month
        </p>
      )}
    </div>
  );
}
