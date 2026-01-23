"use client";

import { Button } from "@/components/ui/button";
import { Target, Plus, ArrowRight } from "@phosphor-icons/react";
import { formatCurrency } from "@/lib/utils";

interface SavingsGoalSetupProps {
  data?: Record<string, unknown>;
  onAction?: (action: string, data?: Record<string, unknown>) => void;
  disabled?: boolean;
}

/**
 * A preview card that shows in the chat and opens the full SavingsGoalSheet drawer
 * when clicked. This keeps the chat conversational while reusing the existing form.
 */
export function SavingsGoalSetup({ data, onAction, disabled }: SavingsGoalSetupProps) {
  const suggestedName = (data?.name as string) || "";
  const suggestedAmount = (data?.suggestedAmount as number) || 1000;
  const currency = (data?.currency as string) || "BHD";

  const handleOpenSheet = () => {
    onAction?.("open-savings-goal-sheet", {
      name: suggestedName,
      suggestedAmount: suggestedAmount,
      currency: currency,
    });
  };

  if (disabled) {
    return (
      <div className="w-full max-w-sm rounded-xl border border-border/60 bg-card p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Target className="h-4 w-4" weight="duotone" />
          <span className="text-sm">Savings goal setup completed</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm rounded-xl border border-border/60 bg-card overflow-hidden">
      {/* Preview Header */}
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Target className="h-5 w-5 text-primary" weight="duotone" />
          </div>
          <div>
            <p className="font-medium text-sm">Create Savings Goal</p>
            <p className="text-xs text-muted-foreground">
              Set a target and track your progress
            </p>
          </div>
        </div>

        {/* Quick Info */}
        {suggestedName && (
          <div className="rounded-lg bg-muted/50 p-3 space-y-1">
            <p className="text-xs text-muted-foreground">Suggested goal</p>
            <p className="text-sm font-medium">{suggestedName}</p>
            {suggestedAmount > 0 && (
              <p className="text-xs text-muted-foreground">
                Target: {formatCurrency(suggestedAmount)}
              </p>
            )}
          </div>
        )}

        {/* Features preview */}
        <div className="flex flex-wrap gap-1.5">
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
            Set target amount
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
            Choose category
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
            Auto-contribute
          </span>
        </div>
      </div>

      {/* Action Button */}
      <div className="px-4 pb-4">
        <Button
          onClick={handleOpenSheet}
          className="w-full rounded-full group"
          size="sm"
        >
          <Plus className="h-4 w-4 mr-1.5" weight="bold" />
          Create Goal
          <ArrowRight className="h-3.5 w-3.5 ml-1.5 transition-transform group-hover:translate-x-0.5" />
        </Button>
      </div>
    </div>
  );
}
