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
} from "@/components/ui/field";
import { useIsMobile } from "@/hooks/use-mobile";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@/lib/constants/categories";

interface BankConnection {
  id: string;
  bank_name: string;
  accounts: {
    id: string;
    account_number?: string;
    account_type?: string;
    currency: string;
  }[];
}

export interface TransactionFilters {
  type: "all" | "credit" | "debit";
  category: string;
  bankId: string;
  accountId: string;
  minAmount: string;
  maxAmount: string;
}

interface TransactionFiltersSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: TransactionFilters;
  onApplyFilters: (filters: TransactionFilters) => void;
  banks: BankConnection[];
}

const ALL_CATEGORIES = [
  ...EXPENSE_CATEGORIES.map((c) => ({ ...c, type: "expense" as const })),
  ...INCOME_CATEGORIES.map((c) => ({ ...c, type: "income" as const })),
];

export function TransactionFiltersSheet({
  open,
  onOpenChange,
  filters,
  onApplyFilters,
  banks,
}: TransactionFiltersSheetProps) {
  const isMobile = useIsMobile();

  // Local state for editing
  const [localFilters, setLocalFilters] = useState<TransactionFilters>(filters);

  // Sync local state when sheet opens
  useEffect(() => {
    if (open) {
      setLocalFilters(filters);
    }
  }, [open, filters]);

  // Get accounts for selected bank
  const selectedBank = banks.find((b) => b.id === localFilters.bankId);
  const availableAccounts =
    localFilters.bankId === "all"
      ? banks.flatMap((b) =>
          (b.accounts || []).map((a) => ({ ...a, bankName: b.bank_name }))
        )
      : (selectedBank?.accounts || []).map((a) => ({
          ...a,
          bankName: selectedBank?.bank_name || "",
        }));

  // Reset account when bank changes
  const handleBankChange = (value: string) => {
    setLocalFilters((prev) => ({
      ...prev,
      bankId: value,
      accountId: "all",
    }));
  };

  const handleApply = () => {
    onApplyFilters(localFilters);
    onOpenChange(false);
  };

  const handleReset = () => {
    const resetFilters: TransactionFilters = {
      type: "all",
      category: "all",
      bankId: "all",
      accountId: "all",
      minAmount: "",
      maxAmount: "",
    };
    setLocalFilters(resetFilters);
  };

  const hasActiveFilters =
    localFilters.type !== "all" ||
    localFilters.category !== "all" ||
    localFilters.bankId !== "all" ||
    localFilters.accountId !== "all" ||
    localFilters.minAmount !== "" ||
    localFilters.maxAmount !== "";

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction={isMobile ? "bottom" : "right"}>
      <DrawerContent
        className={
          isMobile
            ? "max-h-[85svh] flex flex-col"
            : "h-full w-full max-w-md flex flex-col"
        }
      >
        {/* Header */}
        <div className="border-b shrink-0">
          <DrawerHeader className={`pb-4 pt-4 ${!isMobile ? "text-left" : ""}`}>
            <DrawerTitle className={isMobile ? "text-center text-xl" : "text-xl"}>
              Filter Transactions
            </DrawerTitle>
            <DrawerDescription
              className={`${isMobile ? "text-center" : ""} text-muted-foreground`}
            >
              Narrow down your transactions
            </DrawerDescription>
          </DrawerHeader>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          <FieldGroup className="gap-5">
            {/* Transaction Type */}
            <Field>
              <FieldLabel>Transaction Type</FieldLabel>
              <Select
                value={localFilters.type}
                onValueChange={(v) =>
                  setLocalFilters((prev) => ({ ...prev, type: v as TransactionFilters["type"] }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="debit">Expenses</SelectItem>
                  <SelectItem value="credit">Income</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            {/* Category */}
            <Field>
              <FieldLabel>Category</FieldLabel>
              <Select
                value={localFilters.category}
                onValueChange={(v) =>
                  setLocalFilters((prev) => ({ ...prev, category: v }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {ALL_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            {/* Bank Filter */}
            {banks.length > 0 && (
              <Field>
                <FieldLabel>Bank</FieldLabel>
                <Select value={localFilters.bankId} onValueChange={handleBankChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All Banks" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Banks</SelectItem>
                    {banks.map((bank) => (
                      <SelectItem key={bank.id} value={bank.id}>
                        {bank.bank_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}

            {/* Account Filter */}
            {availableAccounts.length > 0 && (
              <Field>
                <FieldLabel>Account</FieldLabel>
                <Select
                  value={localFilters.accountId}
                  onValueChange={(v) =>
                    setLocalFilters((prev) => ({ ...prev, accountId: v }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All Accounts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Accounts</SelectItem>
                    {availableAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.account_type || "Account"} ****
                        {account.account_number?.slice(-4)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}

            {/* Amount Range */}
            <Field>
              <FieldLabel>Amount Range</FieldLabel>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder="Min"
                  value={localFilters.minAmount}
                  onChange={(e) =>
                    setLocalFilters((prev) => ({ ...prev, minAmount: e.target.value }))
                  }
                  className="flex-1"
                />
                <span className="text-muted-foreground">to</span>
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder="Max"
                  value={localFilters.maxAmount}
                  onChange={(e) =>
                    setLocalFilters((prev) => ({ ...prev, maxAmount: e.target.value }))
                  }
                  className="flex-1"
                />
              </div>
            </Field>
          </FieldGroup>
        </div>

        <DrawerFooter className="shrink-0 bg-background border-t px-4 py-4 flex-col gap-3 sm:flex-row">
          {hasActiveFilters && (
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              className="w-full sm:w-auto sm:mr-auto"
            >
              Reset All
            </Button>
          )}
          <div className="flex gap-3 w-full sm:w-auto sm:ml-auto">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 sm:flex-none"
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleApply} className="flex-1 sm:flex-none">
              Apply Filters
            </Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
