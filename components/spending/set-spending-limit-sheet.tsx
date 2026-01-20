"use client";

import { useState, useEffect } from "react";
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
  Field,
  FieldLabel,
  FieldGroup,
  FieldError,
  FieldDescription,
} from "@/components/ui/field";
import { SpinnerGap, Trash } from "@phosphor-icons/react";
import { EXPENSE_CATEGORIES, getCategoryLabel } from "@/lib/constants/categories";
import { useIsMobile } from "@/hooks/use-mobile";

interface Budget {
  id: string;
  category: string;
  amount: number;
  spent: number;
  remaining: number;
  percentage: number;
  currency: string;
  period: string;
}

interface SetSpendingLimitSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  existingBudget?: Budget | null;
  selectedCategory?: string;
  defaultCurrency?: string;
}

export function SetSpendingLimitSheet({
  open,
  onOpenChange,
  onSuccess,
  existingBudget,
  selectedCategory,
  defaultCurrency = "BHD",
}: SetSpendingLimitSheetProps) {
  const isMobile = useIsMobile();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [category, setCategory] = useState(selectedCategory || "");
  const [limitAmount, setLimitAmount] = useState("");

  // Update form when editing an existing budget
  useEffect(() => {
    if (existingBudget) {
      setCategory(existingBudget.category);
      setLimitAmount(existingBudget.amount.toString());
    } else if (selectedCategory) {
      setCategory(selectedCategory);
      setLimitAmount("");
    }
  }, [existingBudget, selectedCategory, open]);

  const isEditing = !!existingBudget;

  const resetForm = () => {
    setCategory(selectedCategory || "");
    setLimitAmount("");
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    const parsedAmount = parseFloat(limitAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Please enter a valid budget amount");
      return;
    }

    if (!category) {
      setError("Please select a category");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/finance/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          amount: parsedAmount,
          currency: defaultCurrency,
          period: "monthly",
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to set budget");
      }

      resetForm();
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set budget");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!existingBudget) return;

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/finance/budgets/${existingBudget.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to remove budget");
      }

      resetForm();
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove budget");
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

  const currentSpent = existingBudget?.spent || 0;
  const percentage = existingBudget
    ? Math.round((currentSpent / existingBudget.amount) * 100)
    : 0;

  return (
    <Drawer open={open} onOpenChange={handleOpenChange} direction={isMobile ? "bottom" : "right"}>
      <DrawerContent className={isMobile ? "max-h-[85svh] flex flex-col" : "h-full w-full max-w-md flex flex-col"}>
        {/* Header */}
        <div className="border-b shrink-0">
          <DrawerHeader className={`pb-4 pt-4 ${!isMobile ? "text-left" : ""}`}>
            <DrawerTitle className={isMobile ? "text-center text-xl" : "text-xl"}>
              {isEditing ? "Edit Spending Limit" : "Set Spending Limit"}
            </DrawerTitle>
            <DrawerDescription className={`${isMobile ? "text-center" : ""} text-muted-foreground`}>
              {isEditing
                ? `Update your monthly budget for ${getCategoryLabel(existingBudget.category, "expense")}`
                : "Set a monthly spending limit for a category"}
            </DrawerDescription>
          </DrawerHeader>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <FieldGroup className="gap-5">
              {/* Category */}
              <Field>
                <FieldLabel htmlFor="category">Category</FieldLabel>
                {isEditing ? (
                  <div className="h-9 flex items-center px-2.5 bg-muted rounded-md text-sm">
                    {getCategoryLabel(category, "expense")}
                  </div>
                ) : (
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger id="category" className="w-full">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPENSE_CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </Field>

              {/* Budget Amount */}
              <Field>
                <FieldLabel htmlFor="limit">Monthly Limit ({defaultCurrency})</FieldLabel>
                <Input
                  id="limit"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={limitAmount}
                  onChange={(e) => setLimitAmount(e.target.value)}
                  className="text-lg"
                  autoFocus={!isMobile}
                />
                {isEditing && currentSpent > 0 && (
                  <FieldDescription>
                    You've spent {defaultCurrency} {currentSpent.toFixed(2)} ({percentage}%) this month
                  </FieldDescription>
                )}
              </Field>

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
                Remove
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
                  "Update Limit"
                ) : (
                  "Set Limit"
                )}
              </Button>
            </div>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
