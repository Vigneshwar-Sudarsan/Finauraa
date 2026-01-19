"use client";

import { Plus, Bank, SpinnerGap, Check } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface Account {
  id: string;
  balance: number;
  currency: string;
}

interface BankConnection {
  id: string;
  bank_id: string;
  bank_name: string;
  status: string;
  accounts: Account[];
}

interface BankSelectorProps {
  banks: BankConnection[];
  selectedBankId: string | null;
  onBankSelect: (bankId: string | null) => void;
  isLoading: boolean;
}

export function BankSelector({
  banks,
  selectedBankId,
  onBankSelect,
  isLoading,
}: BankSelectorProps) {
  const [isConnecting, setIsConnecting] = useState(false);

  const handleAddBank = async () => {
    setIsConnecting(true);
    try {
      const response = await fetch("/api/tarabut/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error("Failed to connect");
      }

      const { authorizationUrl } = await response.json();
      window.location.href = authorizationUrl;
    } catch (error) {
      console.error("Failed to initiate connection:", error);
      setIsConnecting(false);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-BH", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getBankTotalBalance = (bank: BankConnection) => {
    return bank.accounts.reduce((sum, acc) => sum + acc.balance, 0);
  };

  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto py-2 -mx-4 px-4 snap-x snap-mandatory scrollbar-hide">
        {/* Add bank skeleton */}
        <div className="flex-shrink-0 w-14 h-32 rounded-xl border-2 border-dashed border-muted bg-muted/30 animate-pulse snap-start" />
        {/* Bank card skeletons */}
        {[1, 2].map((i) => (
          <div
            key={i}
            className="flex-shrink-0 w-48 h-32 rounded-xl border bg-card animate-pulse snap-start"
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className="flex gap-4 overflow-x-auto py-2 -mx-4 px-4 snap-x snap-mandatory scrollbar-hide"
      style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
    >
      {/* Add Bank Button - Always First */}
      <button
        onClick={handleAddBank}
        disabled={isConnecting}
        className={cn(
          "flex-shrink-0 w-14 h-32 rounded-xl border-2 border-dashed border-muted-foreground/30",
          "flex items-center justify-center snap-start",
          "hover:border-muted-foreground/50 hover:bg-muted/50 transition-colors",
          "focus:outline-none",
          isConnecting && "opacity-50 cursor-not-allowed"
        )}
      >
        {isConnecting ? (
          <SpinnerGap size={20} className="text-muted-foreground animate-spin" />
        ) : (
          <Plus size={20} className="text-muted-foreground" />
        )}
      </button>

      {/* Bank Cards */}
      {banks.map((bank) => {
        const isSelected = selectedBankId === bank.id;
        const totalBalance = getBankTotalBalance(bank);
        const currency = bank.accounts[0]?.currency ?? "BHD";
        const accountCount = bank.accounts.length;

        return (
          <button
            key={bank.id}
            onClick={() => onBankSelect(bank.id)}
            className={cn(
              "flex-shrink-0 w-48 h-32 rounded-xl border p-4 flex flex-col justify-between snap-start transition-all text-left",
              "focus:outline-none",
              isSelected
                ? "border-foreground bg-foreground text-background"
                : "bg-card hover:bg-muted/50"
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "size-10 rounded-full flex items-center justify-center",
                    isSelected ? "bg-background/20" : "bg-muted"
                  )}
                >
                  {isSelected ? (
                    <Check size={20} weight="bold" />
                  ) : (
                    <Bank size={20} className="text-muted-foreground" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-sm truncate max-w-[100px]">
                    {bank.bank_name}
                  </p>
                  <p
                    className={cn(
                      "text-xs",
                      isSelected ? "text-background/70" : "text-muted-foreground"
                    )}
                  >
                    {accountCount} account{accountCount !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <p className="text-xl font-bold">
                {formatCurrency(totalBalance, currency)}
              </p>
              <p
                className={cn(
                  "text-xs",
                  isSelected ? "text-background/70" : "text-muted-foreground"
                )}
              >
                Total Balance
              </p>
            </div>
          </button>
        );
      })}

      {/* Empty state */}
      {banks.length === 0 && (
        <div className="flex-shrink-0 w-48 h-32 rounded-xl border bg-muted/30 p-4 flex items-center justify-center snap-start">
          <p className="text-xs text-muted-foreground text-center">
            No banks connected yet
          </p>
        </div>
      )}
    </div>
  );
}
