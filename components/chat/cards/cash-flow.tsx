"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Check, TrendUp, TrendDown, Warning, Calendar } from "@phosphor-icons/react";
import { formatCurrency } from "@/lib/utils";
import { formatDate } from "@/lib/date-utils";

interface CashFlowProps {
  data?: Record<string, unknown>;
  onAction?: (action: string, data?: Record<string, unknown>) => void;
  disabled?: boolean;
}

interface BillDue {
  name: string;
  amount: number;
  dueDate: string;
  isRecurring: boolean;
}

interface CashFlowData {
  monthlyIncome: number;
  monthlyExpenses: number;
  netCashFlow: number;
  savingsRate: number;
  nextWeekProjection: number;
  nextMonthProjection: number;
  billsDue: BillDue[];
  lowBalanceWarning: boolean;
  projectedLowDate?: string;
  currency: string;
}

export function CashFlow({ data, onAction, disabled }: CashFlowProps) {
  const [cashFlow, setCashFlow] = useState<CashFlowData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/finance/cash-flow");
        if (response.ok) {
          const result = await response.json();
          setCashFlow(result);
        }
      } catch (error) {
        console.error("Failed to fetch cash flow:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (data?.monthlyIncome !== undefined) {
      setCashFlow(data as unknown as CashFlowData);
      setIsLoading(false);
    } else {
      fetchData();
    }
  }, [data]);

  const currency = cashFlow?.currency ?? "BHD";

  if (isLoading) {
    return (
      <div className="w-full max-w-sm rounded-xl border border-border/60 bg-card p-4 space-y-4">
        <div className="space-y-2">
          <div className="h-3 w-24 bg-muted rounded animate-pulse" />
          <div className="h-6 w-32 bg-muted rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-3 rounded-lg bg-muted/50">
              <div className="h-3 w-12 bg-muted rounded animate-pulse mb-2" />
              <div className="h-5 w-20 bg-muted rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!cashFlow) {
    return (
      <div className="w-full max-w-sm rounded-xl border border-border/60 bg-card p-4">
        <p className="text-sm text-muted-foreground">
          Connect your bank account to see your cash flow analysis.
        </p>
      </div>
    );
  }

  const isPositive = cashFlow.netCashFlow >= 0;

  return (
    <div className="w-full max-w-sm rounded-xl border border-border/60 bg-card p-4 space-y-4">
      {/* Header - Net Cash Flow */}
      <div>
        <p className="text-xs text-muted-foreground">Monthly Cash Flow</p>
        <div className="flex items-center gap-2">
          <p className={`text-xl font-semibold ${isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
            {isPositive ? "+" : ""}{formatCurrency(cashFlow.netCashFlow)}
          </p>
          {isPositive ? (
            <TrendUp className="h-5 w-5 text-green-600 dark:text-green-400" weight="bold" />
          ) : (
            <TrendDown className="h-5 w-5 text-red-600 dark:text-red-400" weight="bold" />
          )}
        </div>
      </div>

      {/* Income vs Expenses */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-lg bg-green-500/10">
          <p className="text-xs text-muted-foreground">Income</p>
          <p className="font-semibold text-green-600 dark:text-green-400">
            {formatCurrency(cashFlow.monthlyIncome)}
          </p>
        </div>
        <div className="p-3 rounded-lg bg-red-500/10">
          <p className="text-xs text-muted-foreground">Expenses</p>
          <p className="font-semibold text-red-600 dark:text-red-400">
            {formatCurrency(cashFlow.monthlyExpenses)}
          </p>
        </div>
      </div>

      {/* Savings Rate */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Savings Rate</span>
        <span className={`font-semibold ${cashFlow.savingsRate >= 20 ? "text-green-600 dark:text-green-400" : cashFlow.savingsRate >= 10 ? "text-yellow-600 dark:text-yellow-400" : "text-red-600 dark:text-red-400"}`}>
          {cashFlow.savingsRate.toFixed(1)}%
        </span>
      </div>

      {/* Projections */}
      <div className="space-y-2 pt-2 border-t border-border/40">
        <p className="text-xs font-medium text-muted-foreground">Projected Balance</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-2 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Next Week</p>
            <p className="font-medium">{formatCurrency(cashFlow.nextWeekProjection)}</p>
          </div>
          <div className="p-2 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Next Month</p>
            <p className="font-medium">{formatCurrency(cashFlow.nextMonthProjection)}</p>
          </div>
        </div>
      </div>

      {/* Low Balance Warning */}
      {cashFlow.lowBalanceWarning && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <div className="flex items-start gap-2">
            <Warning className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" weight="bold" />
            <div className="text-xs">
              <p className="font-medium text-red-600 dark:text-red-400">Low Balance Warning</p>
              <p className="text-muted-foreground">
                Balance may run low around {cashFlow.projectedLowDate && formatDate(cashFlow.projectedLowDate, "monthDay")}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Upcoming Bills */}
      {cashFlow.billsDue.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-border/40">
          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            Upcoming Bills
          </p>
          <div className="space-y-1.5">
            {cashFlow.billsDue.slice(0, 3).map((bill, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground truncate max-w-[60%]">{bill.name}</span>
                <div className="text-right">
                  <span className="font-medium">{formatCurrency(bill.amount)}</span>
                  <span className="text-xs text-muted-foreground ml-1.5">{formatDate(bill.dueDate, "monthDay")}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      {disabled ? (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Check size={14} weight="bold" />
          <span>Action completed</span>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => onAction?.("analyze-spending")}
            className="flex-1 rounded-full"
          >
            Reduce Expenses
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAction?.("view-recurring")}
            className="flex-1 rounded-full"
          >
            View Bills
          </Button>
        </div>
      )}
    </div>
  );
}
