"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Field,
  FieldLabel,
  FieldGroup,
  FieldError,
  FieldDescription,
} from "@/components/ui/field";
import { SpinnerGap, Trash, CalendarBlank } from "@phosphor-icons/react";
import { Switch } from "@/components/ui/switch";
import { SAVINGS_GOAL_CATEGORIES } from "@/lib/constants/categories";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface SavingsGoal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  currency: string;
  target_date?: string;
  category?: string;
  auto_contribute: boolean;
  auto_contribute_percentage?: number;
  is_completed: boolean;
}

interface SavingsGoalSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  existingGoal?: SavingsGoal | null;
  defaultCurrency?: string;
}

export function SavingsGoalSheet({
  open,
  onOpenChange,
  onSuccess,
  existingGoal,
  defaultCurrency = "BHD",
}: SavingsGoalSheetProps) {
  const isMobile = useIsMobile();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [targetDate, setTargetDate] = useState<Date | undefined>(undefined);
  const [category, setCategory] = useState("");
  const [autoContribute, setAutoContribute] = useState(false);
  const [autoContributePercentage, setAutoContributePercentage] = useState("");

  const isEditing = !!existingGoal;

  // Update form when editing an existing goal
  useEffect(() => {
    if (existingGoal) {
      setName(existingGoal.name);
      setTargetAmount(existingGoal.target_amount.toString());
      setTargetDate(existingGoal.target_date ? new Date(existingGoal.target_date) : undefined);
      setCategory(existingGoal.category || "");
      setAutoContribute(existingGoal.auto_contribute);
      setAutoContributePercentage(
        existingGoal.auto_contribute_percentage?.toString() || ""
      );
    } else {
      resetForm();
    }
  }, [existingGoal, open]);

  const resetForm = () => {
    setName("");
    setTargetAmount("");
    setTargetDate(undefined);
    setCategory("");
    setAutoContribute(false);
    setAutoContributePercentage("");
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!name.trim()) {
      setError("Please enter a goal name");
      return;
    }

    const parsedAmount = parseFloat(targetAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Please enter a valid target amount");
      return;
    }

    const parsedPercentage = autoContribute
      ? parseFloat(autoContributePercentage)
      : null;
    if (autoContribute && (isNaN(parsedPercentage!) || parsedPercentage! <= 0 || parsedPercentage! > 100)) {
      setError("Auto-contribute percentage must be between 1 and 100");
      return;
    }

    setIsSubmitting(true);

    try {
      const url = isEditing
        ? `/api/finance/savings-goals/${existingGoal.id}`
        : "/api/finance/savings-goals";

      const response = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          target_amount: parsedAmount,
          target_date: targetDate ? format(targetDate, "yyyy-MM-dd") : null,
          category: category || null,
          currency: defaultCurrency,
          auto_contribute: autoContribute,
          auto_contribute_percentage: autoContribute ? parsedPercentage : null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save goal");
      }

      resetForm();
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save goal");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!existingGoal) return;

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/finance/savings-goals/${existingGoal.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete goal");
      }

      resetForm();
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete goal");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  // Calculate suggested monthly savings if target date is set
  const suggestedMonthlySavings = (() => {
    if (!targetDate || !targetAmount) return null;
    const target = parseFloat(targetAmount);
    if (isNaN(target)) return null;

    const today = new Date();
    const monthsRemaining = Math.max(
      1,
      (targetDate.getFullYear() - today.getFullYear()) * 12 +
        (targetDate.getMonth() - today.getMonth())
    );

    const currentSaved = existingGoal?.current_amount || 0;
    const remaining = target - currentSaved;
    return remaining > 0 ? (remaining / monthsRemaining).toFixed(2) : null;
  })();

  return (
    <Drawer open={open} onOpenChange={handleOpenChange} direction={isMobile ? "bottom" : "right"}>
      <DrawerContent className={isMobile ? "!max-h-[96vh] h-[96vh] flex flex-col" : "h-full w-full max-w-md flex flex-col"}>
        {/* Header */}
        <div className="border-b shrink-0">
          <DrawerHeader className={`pb-4 pt-4 ${!isMobile ? "text-left" : ""}`}>
            <DrawerTitle className={isMobile ? "text-center text-xl" : "text-xl"}>
              {isEditing ? "Edit Savings Goal" : "Create Savings Goal"}
            </DrawerTitle>
            <DrawerDescription className={`${isMobile ? "text-center" : ""} text-muted-foreground`}>
              {isEditing
                ? "Update your savings goal details"
                : "Set a target and track your progress"}
            </DrawerDescription>
          </DrawerHeader>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <FieldGroup className="gap-5">
              {/* Goal Name */}
              <Field>
                <FieldLabel htmlFor="name">Goal Name</FieldLabel>
                <Input
                  id="name"
                  type="text"
                  placeholder="e.g., Emergency Fund, New Car"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus={!isMobile}
                />
              </Field>

              {/* Target Amount */}
              <Field>
                <FieldLabel htmlFor="target">Target Amount ({defaultCurrency})</FieldLabel>
                <Input
                  id="target"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  className="text-lg"
                />
                {isEditing && existingGoal.current_amount > 0 && (
                  <FieldDescription>
                    Currently saved: {defaultCurrency} {existingGoal.current_amount.toFixed(2)}
                  </FieldDescription>
                )}
              </Field>

              {/* Two column layout for date and category on larger screens */}
              <div className="grid gap-5 sm:grid-cols-2">
                {/* Target Date (optional) */}
                <Field>
                  <FieldLabel>
                    Target Date <span className="text-muted-foreground font-normal">(optional)</span>
                  </FieldLabel>
                  <div className="relative">
                    <Input
                      value={targetDate ? format(targetDate, "dd/MM/yyyy") : ""}
                      placeholder="Pick a date"
                      className="bg-background pr-10"
                      readOnly
                    />
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          className="absolute top-1/2 right-2 size-6 -translate-y-1/2"
                        >
                          <CalendarBlank size={14} />
                          <span className="sr-only">Select date</span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-auto overflow-hidden p-0"
                        align="end"
                        alignOffset={-8}
                        sideOffset={10}
                      >
                        <Calendar
                          mode="single"
                          selected={targetDate}
                          onSelect={setTargetDate}
                          captionLayout="dropdown"
                          startMonth={new Date()}
                          endMonth={new Date(new Date().getFullYear() + 10, 11)}
                          disabled={(date) => {
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            return date <= today;
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </Field>

                {/* Category (optional) */}
                <Field>
                  <FieldLabel htmlFor="category">
                    Category <span className="text-muted-foreground font-normal">(optional)</span>
                  </FieldLabel>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger id="category" className="w-full">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {SAVINGS_GOAL_CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              {suggestedMonthlySavings && (
                <div className="rounded-lg bg-primary/5 border border-primary/10 p-3">
                  <p className="text-sm text-center">
                    Save <span className="font-semibold text-primary">{defaultCurrency} {suggestedMonthlySavings}</span>/month to reach your goal
                  </p>
                </div>
              )}

              {/* Auto-contribute section */}
              <div className="rounded-xl border p-4">
                <div className="flex items-center justify-between gap-2">
                  <label htmlFor="autoContribute" className="font-medium text-sm cursor-pointer">
                    Auto-Contribute Reminder
                  </label>
                  <Switch
                    id="autoContribute"
                    checked={autoContribute}
                    onCheckedChange={setAutoContribute}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Get notified to save when income is detected
                </p>

                {/* Percentage input - appears when enabled */}
                {autoContribute && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Save percentage</span>
                      <div className="flex items-center gap-1.5">
                        <Input
                          id="percentage"
                          type="number"
                          inputMode="numeric"
                          step="1"
                          min="1"
                          max="100"
                          placeholder="10"
                          value={autoContributePercentage}
                          onChange={(e) => setAutoContributePercentage(e.target.value)}
                          className="w-16 h-8 text-center text-sm"
                        />
                        <span className="text-sm text-muted-foreground">%</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {error && <FieldError>{error}</FieldError>}
            </FieldGroup>
          </div>

          <DrawerFooter className="shrink-0 bg-background border-t px-4 py-4 flex-col gap-3 sm:flex-row">
            {isEditing && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={isSubmitting || isDeleting}
                className="w-full sm:w-auto sm:mr-auto"
              >
                {isDeleting ? (
                  <SpinnerGap size={16} className="animate-spin" />
                ) : (
                  <Trash size={16} />
                )}
                Delete Goal
              </Button>
            )}
            <div className="flex gap-3 w-full sm:w-auto">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isSubmitting || isDeleting}
                className="flex-1 sm:flex-none"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || isDeleting}
                className="flex-1 sm:flex-none"
              >
                {isSubmitting ? (
                  <>
                    <SpinnerGap size={16} className="animate-spin" />
                    Saving...
                  </>
                ) : isEditing ? (
                  "Update Goal"
                ) : (
                  "Create Goal"
                )}
              </Button>
            </div>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
