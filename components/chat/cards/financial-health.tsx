"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Check, TrendUp, TrendDown, Minus, Info, Sparkle } from "@phosphor-icons/react";

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

type AuraLevel = "Radiant" | "Bright" | "Steady" | "Dim" | "Critical";

interface FinancialHealthData {
  score: number;
  auraLevel: AuraLevel;
  factors: {
    savingsRate: HealthFactor;
    budgetAdherence: HealthFactor;
    emergencyFund: EmergencyFundFactor;
    spendingStability: SpendingStabilityFactor;
  };
  topRecommendation: string;
}

// Aura Level configuration
const AURA_LEVELS: { level: AuraLevel; min: number; max: number; color: string; bgColor: string; description: string }[] = [
  { level: "Radiant", min: 90, max: 100, color: "text-purple-500", bgColor: "bg-purple-500", description: "Exceptional" },
  { level: "Bright", min: 75, max: 89, color: "text-green-500", bgColor: "bg-green-500", description: "Strong" },
  { level: "Steady", min: 60, max: 74, color: "text-blue-500", bgColor: "bg-blue-500", description: "Stable" },
  { level: "Dim", min: 40, max: 59, color: "text-yellow-500", bgColor: "bg-yellow-500", description: "Needs attention" },
  { level: "Critical", min: 0, max: 39, color: "text-red-500", bgColor: "bg-red-500", description: "Urgent action needed" },
];

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
          Connect your bank account to see your Aura Score.
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

  const currentAuraConfig = AURA_LEVELS.find(a => a.level === health.auraLevel) || AURA_LEVELS[4];

  return (
    <div className="w-full max-w-sm rounded-xl border border-border/60 bg-card p-4 space-y-4">
      {/* Aura Score Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <Sparkle className="h-4 w-4 text-purple-500" weight="fill" />
            <p className="text-xs text-muted-foreground">Aura Score</p>
          </div>
          <p className="text-2xl font-bold">{health.score}<span className="text-sm font-normal text-muted-foreground">/100</span></p>
        </div>
        <div className={`text-right`}>
          <p className={`text-lg font-semibold ${currentAuraConfig.color}`}>{health.auraLevel}</p>
          <p className="text-[10px] text-muted-foreground">{currentAuraConfig.description}</p>
        </div>
      </div>

      {/* Score Bar */}
      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`absolute h-full rounded-full transition-all duration-500 ${currentAuraConfig.bgColor}`}
          style={{ width: `${health.score}%` }}
        />
      </div>

      {/* Aura Level Scale */}
      <div className="flex items-center gap-0.5">
        {AURA_LEVELS.map((a) => (
          <div
            key={a.level}
            className={`flex-1 text-center py-1.5 rounded-sm text-[9px] font-medium transition-all ${
              health.auraLevel === a.level
                ? `${a.bgColor} text-white`
                : "bg-muted/50 text-muted-foreground"
            }`}
          >
            <div className="truncate px-0.5">{a.level}</div>
          </div>
        ))}
      </div>

      {/* Factors */}
      <div className="space-y-2.5 pt-1">
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
