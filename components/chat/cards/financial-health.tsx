"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Check, TrendUp, TrendDown, Minus, Info } from "@phosphor-icons/react";

interface FinancialHealthProps {
  data?: Record<string, unknown>;
  onAction?: (action: string, data?: Record<string, unknown>) => void;
  disabled?: boolean;
}

interface HealthFactor {
  score: number;
  value: number;
  status: "good" | "warning" | "critical";
}

interface EmergencyFundFactor {
  score: number;
  months: number;
  status: "good" | "warning" | "critical";
}

interface SpendingStabilityFactor {
  score: number;
  volatility: number;
  status: "good" | "warning" | "critical";
}

interface FinancialHealthData {
  score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  factors: {
    savingsRate: HealthFactor;
    budgetAdherence: HealthFactor;
    emergencyFund: EmergencyFundFactor;
    spendingStability: SpendingStabilityFactor;
  };
  topRecommendation: string;
}

const GRADE_COLORS: Record<string, string> = {
  A: "text-green-600 dark:text-green-400",
  B: "text-blue-600 dark:text-blue-400",
  C: "text-yellow-600 dark:text-yellow-400",
  D: "text-orange-600 dark:text-orange-400",
  F: "text-red-600 dark:text-red-400",
};

const STATUS_COLORS: Record<string, string> = {
  good: "text-green-600 dark:text-green-400",
  warning: "text-yellow-600 dark:text-yellow-400",
  critical: "text-red-600 dark:text-red-400",
};

const STATUS_BG: Record<string, string> = {
  good: "bg-green-500/20",
  warning: "bg-yellow-500/20",
  critical: "bg-red-500/20",
};

export function FinancialHealth({ data, onAction, disabled }: FinancialHealthProps) {
  const [health, setHealth] = useState<FinancialHealthData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/finance/health");
        if (response.ok) {
          const result = await response.json();
          setHealth(result);
        }
      } catch (error) {
        console.error("Failed to fetch financial health:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (data?.score !== undefined) {
      setHealth(data as unknown as FinancialHealthData);
      setIsLoading(false);
    } else {
      fetchData();
    }
  }, [data]);

  if (isLoading) {
    return (
      <div className="w-full max-w-sm rounded-xl border border-border/60 bg-card p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-5 w-32 bg-muted rounded animate-pulse" />
          <div className="h-10 w-10 bg-muted rounded-full animate-pulse" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="h-3 w-24 bg-muted rounded animate-pulse" />
              <div className="h-3 w-16 bg-muted rounded animate-pulse" />
            </div>
          ))}
        </div>
        <div className="h-12 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  if (!health) {
    return (
      <div className="w-full max-w-sm rounded-xl border border-border/60 bg-card p-4">
        <p className="text-sm text-muted-foreground">
          Connect your bank account to see your financial health score.
        </p>
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "good":
        return <TrendUp className="h-3.5 w-3.5" weight="bold" />;
      case "critical":
        return <TrendDown className="h-3.5 w-3.5" weight="bold" />;
      default:
        return <Minus className="h-3.5 w-3.5" weight="bold" />;
    }
  };

  return (
    <div className="w-full max-w-sm rounded-xl border border-border/60 bg-card p-4 space-y-4">
      {/* Score Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Financial Health Score</p>
          <p className="text-lg font-semibold">{health.score}/100</p>
        </div>
        <div className={`text-3xl font-bold ${GRADE_COLORS[health.grade]}`}>
          {health.grade}
        </div>
      </div>

      {/* Score Bar */}
      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`absolute h-full rounded-full transition-all duration-500 ${
            health.score >= 80
              ? "bg-green-500"
              : health.score >= 60
              ? "bg-yellow-500"
              : "bg-red-500"
          }`}
          style={{ width: `${health.score}%` }}
        />
      </div>

      {/* Factors */}
      <div className="space-y-3">
        {/* Savings Rate */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Savings Rate</span>
          <div className={`flex items-center gap-1.5 ${STATUS_COLORS[health.factors.savingsRate.status]}`}>
            {getStatusIcon(health.factors.savingsRate.status)}
            <span className="font-medium">{health.factors.savingsRate.value.toFixed(0)}%</span>
          </div>
        </div>

        {/* Budget Adherence */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Budget Adherence</span>
          <div className={`flex items-center gap-1.5 ${STATUS_COLORS[health.factors.budgetAdherence.status]}`}>
            {getStatusIcon(health.factors.budgetAdherence.status)}
            <span className="font-medium">{health.factors.budgetAdherence.value.toFixed(0)}%</span>
          </div>
        </div>

        {/* Emergency Fund */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Emergency Fund</span>
          <div className={`flex items-center gap-1.5 ${STATUS_COLORS[health.factors.emergencyFund.status]}`}>
            {getStatusIcon(health.factors.emergencyFund.status)}
            <span className="font-medium">{health.factors.emergencyFund.months} months</span>
          </div>
        </div>

        {/* Spending Stability */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Spending Stability</span>
          <div className={`flex items-center gap-1.5 ${STATUS_COLORS[health.factors.spendingStability.status]}`}>
            {getStatusIcon(health.factors.spendingStability.status)}
            <span className="font-medium capitalize">{health.factors.spendingStability.status}</span>
          </div>
        </div>
      </div>

      {/* Recommendation */}
      <div className={`p-3 rounded-lg ${STATUS_BG[health.factors.savingsRate.status === "critical" ? "critical" : health.factors.emergencyFund.status === "critical" ? "critical" : "good"]}`}>
        <div className="flex gap-2">
          <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <p className="text-xs">{health.topRecommendation}</p>
        </div>
      </div>

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
            View Spending
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAction?.("create-budget")}
            className="flex-1 rounded-full"
          >
            Set Budget
          </Button>
        </div>
      )}
    </div>
  );
}
