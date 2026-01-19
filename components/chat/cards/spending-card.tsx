"use client";

import { TrendDown, TrendUp } from "@phosphor-icons/react";

interface SpendingCardProps {
  data?: Record<string, unknown>;
}

export function SpendingCard({ data }: SpendingCardProps) {
  const amount = (data?.amount as number) ?? 0;
  const currency = (data?.currency as string) ?? "BHD";
  const period = (data?.period as string) ?? "This week";
  const percentOfAvg = (data?.percentOfAvg as number) ?? 100;
  const topCategories = (data?.topCategories as Array<{ name: string; amount: number }>) ?? [];

  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat("en-BH", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 3,
    }).format(amt);
  };

  const isOverAvg = percentOfAvg > 100;

  return (
    <div className="w-full max-w-sm rounded-xl border border-border/60 bg-card p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground font-medium">{period}</p>
          <p className="text-xl font-semibold">{formatCurrency(amount)}</p>
        </div>
        {isOverAvg ? (
          <TrendUp size={20} className="text-muted-foreground" />
        ) : (
          <TrendDown size={20} className="text-muted-foreground" />
        )}
      </div>

      {/* Progress vs average */}
      <div className="space-y-2">
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-foreground/60 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(percentOfAvg, 100)}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {percentOfAvg}% of weekly average
        </p>
      </div>

      {/* Top categories */}
      {topCategories.length > 0 && (
        <div className="pt-1 border-t border-border/40">
          <p className="text-xs text-muted-foreground mb-1">Top spending:</p>
          <p className="text-xs text-foreground">
            {topCategories
              .map((cat) => `${cat.name} (${formatCurrency(cat.amount)})`)
              .join(" · ")}
          </p>
        </div>
      )}
    </div>
  );
}
