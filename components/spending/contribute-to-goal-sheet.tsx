"use client";

import { useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Field,
  FieldLabel,
  FieldGroup,
  FieldError,
  FieldDescription,
} from "@/components/ui/field";
import { SpinnerGap, Confetti } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface SavingsGoal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  currency: string;
  target_date?: string;
  category?: string;
  progress_percentage?: number;
  remaining?: number;
  days_remaining?: number | null;
}

interface ContributeToGoalSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  goal: SavingsGoal | null;
  suggestedAmount?: number;
}

export function ContributeToGoalSheet({
  open,
  onOpenChange,
  onSuccess,
  goal,
  suggestedAmount,
}: ContributeToGoalSheetProps) {
  const isMobile = useIsMobile();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [justCompleted, setJustCompleted] = useState(false);

  if (!goal) return null;

  const currency = goal.currency || "BHD";
  const remaining = goal.remaining ?? (goal.target_amount - goal.current_amount);
  const progressPercentage = goal.progress_percentage ??
    Math.round((goal.current_amount / goal.target_amount) * 100);

  const quickAmounts = [50, 100, 250, 500].filter((amt) => amt <= remaining + 100);

  const resetForm = () => {
    setAmount("");
    setError(null);
    setJustCompleted(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/finance/savings-goals/${goal.id}/contribute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: parsedAmount }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to add contribution");
      }

      const data = await response.json();

      if (data.contribution?.just_completed) {
        setJustCompleted(true);
        // Show celebration briefly, then close
        setTimeout(() => {
          resetForm();
          onOpenChange(false);
          onSuccess?.();
        }, 2000);
      } else {
        resetForm();
        onOpenChange(false);
        onSuccess?.();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add contribution");
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  const handleQuickAmount = (amt: number) => {
    setAmount(amt.toString());
  };

  // Preview the new progress if amount is entered
  const previewAmount = parseFloat(amount) || 0;
  const previewTotal = goal.current_amount + previewAmount;
  const previewPercentage = Math.min(
    100,
    Math.round((previewTotal / goal.target_amount) * 100)
  );

  return (
    <Drawer open={open} onOpenChange={handleOpenChange} direction={isMobile ? "bottom" : "right"}>
      <DrawerContent className={isMobile ? "!max-h-[96vh] h-auto flex flex-col" : "h-full w-full max-w-md flex flex-col"}>
        {justCompleted ? (
          <div className="py-8 flex flex-col items-center justify-center gap-4 animate-in fade-in zoom-in flex-1">
            <div className="size-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <Confetti size={32} className="text-emerald-500" weight="fill" />
            </div>
            <div className="text-center">
              <h3 className="text-xl font-semibold">Goal Completed!</h3>
              <p className="text-muted-foreground mt-1">
                Congratulations on reaching your {goal.name} goal!
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="border-b shrink-0">
              <DrawerHeader className={`pb-4 pt-4 ${!isMobile ? "text-left" : ""}`}>
                <DrawerTitle className={isMobile ? "text-center text-xl" : "text-xl"}>
                  Add to {goal.name}
                </DrawerTitle>
                <DrawerDescription className={`${isMobile ? "text-center" : ""} text-muted-foreground`}>
                  {remaining > 0
                    ? `${currency} ${remaining.toFixed(2)} remaining to reach your goal`
                    : "You've reached your goal!"}
                </DrawerDescription>
              </DrawerHeader>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto px-4 py-4">
                {/* Progress Preview */}
                <div className="p-4 bg-muted/50 rounded-lg mb-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Progress</span>
                    <span className="text-sm font-medium">
                      {previewAmount > 0 ? (
                        <>
                          <span className="text-muted-foreground">{progressPercentage}%</span>
                          <span className="mx-1">→</span>
                          <span className={cn(
                            previewPercentage >= 100 ? "text-emerald-500" : "text-foreground"
                          )}>
                            {previewPercentage}%
                          </span>
                        </>
                      ) : (
                        `${progressPercentage}%`
                      )}
                    </span>
                  </div>
                  <Progress
                    value={previewAmount > 0 ? previewPercentage : progressPercentage}
                    className={cn(
                      "h-3",
                      previewPercentage >= 100 && "[&>div]:bg-emerald-500"
                    )}
                  />
                  <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                    <span>
                      {currency} {(previewAmount > 0 ? previewTotal : goal.current_amount).toFixed(2)}
                    </span>
                    <span>{currency} {goal.target_amount.toFixed(2)}</span>
                  </div>
                </div>

                <FieldGroup className="gap-5">
                  {/* Suggested Amount Banner */}
                  {suggestedAmount && suggestedAmount > 0 && (
                    <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                      <p className="text-sm">
                        <span className="font-medium">Suggested:</span>{" "}
                        Add {currency} {suggestedAmount.toFixed(2)} based on your income
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => setAmount(suggestedAmount.toString())}
                      >
                        Use Suggestion
                      </Button>
                    </div>
                  )}

                  {/* Quick Amounts */}
                  <div className="flex gap-2 flex-wrap">
                    {quickAmounts.map((amt) => (
                      <Button
                        key={amt}
                        type="button"
                        variant={amount === amt.toString() ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleQuickAmount(amt)}
                      >
                        +{amt}
                      </Button>
                    ))}
                    {remaining > 0 && remaining <= goal.target_amount && (
                      <Button
                        type="button"
                        variant={amount === remaining.toString() ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleQuickAmount(remaining)}
                      >
                        Complete ({remaining.toFixed(0)})
                      </Button>
                    )}
                  </div>

                  {/* Amount Input */}
                  <Field>
                    <FieldLabel htmlFor="amount">Amount ({currency})</FieldLabel>
                    <Input
                      id="amount"
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0.01"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="text-lg"
                      autoFocus
                    />
                    {goal.days_remaining !== null && goal.days_remaining !== undefined && goal.days_remaining > 0 && (
                      <FieldDescription>
                        {goal.days_remaining} days left to reach your target date
                      </FieldDescription>
                    )}
                  </Field>

                  {error && <FieldError>{error}</FieldError>}
                </FieldGroup>
              </div>

              <DrawerFooter className="shrink-0 bg-background border-t px-4 py-4 flex-col gap-3 sm:flex-row">
                <div className="flex gap-3 w-full sm:w-auto sm:ml-auto">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleOpenChange(false)}
                    disabled={isSubmitting}
                    className="flex-1 sm:flex-none"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting || !amount}
                    className="flex-1 sm:flex-none"
                  >
                    {isSubmitting ? (
                      <>
                        <SpinnerGap size={16} className="animate-spin" />
                        Adding...
                      </>
                    ) : (
                      "Add Contribution"
                    )}
                  </Button>
                </div>
              </DrawerFooter>
            </form>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
}
