"use client";

import { useState, useEffect } from "react";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/utils";

interface CategorySpending {
  category: string;
  amount: number;
  percentage: number;
}

interface SpendingData {
  totalSpent: number;
  currency: string;
  categories: CategorySpending[];
}

interface SpendingSummaryProps {
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

export function SpendingSummary({ accountId }: SpendingSummaryProps) {
  const [spending, setSpending] = useState<SpendingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({ days: "30" });
        if (accountId) {
          params.set("account_id", accountId);
        }

        const response = await fetch(`/api/finance/spending?${params.toString()}`);
        // Silently handle 403 - parent component handles consent flow
        if (response.status === 403) {
          setSpending(null);
          return;
        }
        if (response.ok) {
          const result = await response.json();
          setSpending({
            totalSpent: result.totalSpent ?? 0,
            currency: result.currency ?? "BHD",
            categories: result.categories ?? [],
          });
        }
      } catch (error) {
        console.error("Failed to fetch spending:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [accountId]);

  const currency = spending?.currency ?? "BHD";

  if (isLoading) {
    return (
      <div className="space-y-0">
        {[1, 2, 3, 4].map((i) => (
          <div key={i}>
            <div className="flex items-center justify-between py-3">
              <div className="h-4 w-24 bg-muted rounded animate-pulse" />
              <div className="h-4 w-16 bg-muted rounded animate-pulse" />
            </div>
            {i < 4 && <Separator />}
          </div>
        ))}
      </div>
    );
  }

  const categories = spending?.categories ?? [];

  if (categories.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        <p className="text-sm">No spending data yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {/* Total */}
      <div className="flex items-center justify-between py-3">
        <span className="font-medium">Total Spent</span>
        <span className="font-semibold">{formatCurrency(spending?.totalSpent ?? 0)}</span>
      </div>
      <Separator />

      {/* Categories */}
      {categories.slice(0, 5).map((cat, index) => {
        const label = CATEGORY_LABELS[cat.category.toLowerCase()] ?? cat.category;

        return (
          <div key={cat.category}>
            <div className="flex items-center justify-between py-3">
              <span className="text-muted-foreground">{label}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{cat.percentage}%</span>
                <span className="font-medium">{formatCurrency(cat.amount)}</span>
              </div>
            </div>
            {index < Math.min(categories.length - 1, 4) && <Separator />}
          </div>
        );
      })}
    </div>
  );
}
