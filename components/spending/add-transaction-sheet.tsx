"use client";

import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
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
} from "@/components/ui/field";
import { SpinnerGap, ArrowDown, ArrowUp, CalendarBlank } from "@phosphor-icons/react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useCategories } from "@/hooks/use-categories";

interface Account {
  id: string;
  account_number?: string;
  account_type?: string;
  currency: string;
}

interface BankConnection {
  id: string;
  bank_name: string;
  accounts: Account[];
}

interface AddTransactionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  banks?: BankConnection[];
  defaultCurrency?: string;
  isFamily?: boolean; // Scope is determined by the active tab (My = personal, Family = family)
}

export function AddTransactionSheet({
  open,
  onOpenChange,
  onSuccess,
  banks = [],
  defaultCurrency = "BHD",
  isFamily = false,
}: AddTransactionSheetProps) {
  const isMobile = useIsMobile();
  const { expenseCategories, incomeCategories } = useCategories();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [transactionType, setTransactionType] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [transactionDate, setTransactionDate] = useState<Date>(new Date());
  const [accountId, setAccountId] = useState<string>("cash");

  const categories = transactionType === "expense" ? expenseCategories : incomeCategories;

  // Flatten accounts from all banks for the selector
  const allAccounts = banks.flatMap((bank) =>
    (bank.accounts || []).map((acc) => ({
      ...acc,
      bankName: bank.bank_name,
      displayName: `${bank.bank_name} ${acc.account_type ? `- ${acc.account_type}` : ""} (${acc.account_number?.slice(-4) || "****"})`,
    }))
  );

  const resetForm = () => {
    setTransactionType("expense");
    setAmount("");
    setCategory("");
    setDescription("");
    setTransactionDate(new Date());
    setAccountId("cash");
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    if (!category) {
      setError("Please select a category");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/finance/transactions/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parsedAmount,
          transaction_type: transactionType === "expense" ? "debit" : "credit",
          category,
          description: description.trim() || null,
          transaction_date: format(transactionDate, "yyyy-MM-dd"),
          account_id: accountId === "cash" ? null : accountId,
          currency: defaultCurrency,
          transaction_scope: isFamily ? "family" : "personal",
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to add transaction");
      }

      resetForm();
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add transaction");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  return (
    <Drawer open={open} onOpenChange={handleOpenChange} direction={isMobile ? "bottom" : "right"}>
      <DrawerContent className={isMobile ? "max-h-[85svh] flex flex-col" : "h-full w-full max-w-md flex flex-col"}>
        {/* Header */}
        <div className="border-b shrink-0">
          <DrawerHeader className={`pb-4 pt-4 ${!isMobile ? "text-left" : ""}`}>
            <DrawerTitle className={isMobile ? "text-center text-xl" : "text-xl"}>
              Add Transaction
            </DrawerTitle>
            <DrawerDescription className={`${isMobile ? "text-center" : ""} text-muted-foreground`}>
              Record a cash or manual transaction
            </DrawerDescription>
          </DrawerHeader>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <FieldGroup className="gap-5">
              {/* Transaction Type Toggle */}
              <Field>
                <ToggleGroup
                  type="single"
                  value={transactionType}
                  onValueChange={(v) => {
                    if (v) {
                      setTransactionType(v as "expense" | "income");
                      setCategory(""); // Reset category when type changes
                    }
                  }}
                  variant="outline"
                  className="w-full grid grid-cols-2"
                >
                  <ToggleGroupItem
                    value="expense"
                    className="gap-2 data-[state=on]:bg-red-500/10 data-[state=on]:text-red-500 data-[state=on]:border-red-500/30"
                  >
                    <ArrowDown size={16} weight="bold" />
                    Expense
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="income"
                    className="gap-2 data-[state=on]:bg-emerald-500/10 data-[state=on]:text-emerald-500 data-[state=on]:border-emerald-500/30"
                  >
                    <ArrowUp size={16} weight="bold" />
                    Income
                  </ToggleGroupItem>
                </ToggleGroup>
              </Field>

              {/* Amount */}
              <Field>
                <FieldLabel htmlFor="amount">Amount ({defaultCurrency})</FieldLabel>
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
                  autoFocus={!isMobile}
                />
              </Field>

              {/* Category */}
              <Field>
                <FieldLabel htmlFor="category">Category</FieldLabel>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="category" className="w-full">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>


              {/* Description */}
              <Field>
                <FieldLabel htmlFor="description">
                  Description <span className="text-muted-foreground font-normal">(optional)</span>
                </FieldLabel>
                <Textarea
                  id="description"
                  placeholder="What was this for?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                />
              </Field>

              {/* Date */}
              <Field>
                <FieldLabel>Date</FieldLabel>
                <div className="relative">
                  <Input
                    value={format(transactionDate, "dd/MM/yyyy")}
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
                        selected={transactionDate}
                        onSelect={(date) => date && setTransactionDate(date)}
                        captionLayout="dropdown"
                        startMonth={new Date(new Date().getFullYear() - 2, 0)}
                        endMonth={new Date()}
                        disabled={(date) => {
                          const today = new Date();
                          today.setHours(23, 59, 59, 999);
                          return date > today;
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </Field>

              {/* Account Link (optional) */}
              {allAccounts.length > 0 && (
                <Field>
                  <FieldLabel htmlFor="account">
                    Link to Account <span className="text-muted-foreground font-normal">(optional)</span>
                  </FieldLabel>
                  <Select value={accountId} onValueChange={setAccountId}>
                    <SelectTrigger id="account" className="w-full">
                      <SelectValue placeholder="Cash / Manual" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash / Manual</SelectItem>
                      {allAccounts.map((acc) => (
                        <SelectItem key={acc.id} value={acc.id}>
                          {acc.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}

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
              <Button type="submit" disabled={isSubmitting} className="flex-1 sm:flex-none">
                {isSubmitting ? (
                  <>
                    <SpinnerGap size={16} className="animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Add Transaction"
                )}
              </Button>
            </div>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
