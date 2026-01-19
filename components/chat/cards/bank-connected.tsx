"use client";

import { Check, Bank } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

interface BankConnectedProps {
  data?: Record<string, unknown>;
  onAction?: (action: string, data?: Record<string, unknown>) => void;
  disabled?: boolean;
}

export function BankConnected({ data, onAction, disabled }: BankConnectedProps) {
  const bankName = (data?.bankName as string) ?? "Your Bank";
  const accountType = (data?.accountType as string) ?? "Account";
  const accountNumber = (data?.accountNumber as string) ?? "••••1234";
  const balance = (data?.balance as number) ?? 0;
  const currency = (data?.currency as string) ?? "BHD";
  const transactionCount = (data?.transactionCount as number) ?? 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-BH", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: currency === "BHD" ? 3 : 2,
    }).format(amount);
  };

  return (
    <div className="w-full max-w-sm rounded-xl border border-border/60 bg-card p-4 space-y-3">
      {/* Success header */}
      <div className="flex items-center gap-2 text-foreground">
        <div className="size-4 rounded-full bg-foreground flex items-center justify-center">
          <Check size={10} weight="bold" className="text-background" />
        </div>
        <span className="text-sm font-medium">Connected</span>
      </div>

      {/* Account details */}
      <div className="flex items-center gap-3 p-2.5 bg-muted/50 rounded-lg">
        <div className="size-9 rounded-md flex items-center justify-center bg-primary/10 text-primary shrink-0">
          <Bank size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{bankName}</p>
          <p className="text-xs text-muted-foreground">{accountType} • {accountNumber}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold">{formatCurrency(balance)}</p>
          <p className="text-[10px] text-muted-foreground">Available</p>
        </div>
      </div>

      {/* Transaction count */}
      {transactionCount > 0 && (
        <p className="text-xs text-muted-foreground">
          Found {transactionCount} transactions from the last 90 days
        </p>
      )}

      {/* Action buttons */}
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
            Yes, analyze
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAction?.("add-another-bank")}
            className="flex-1 rounded-full"
          >
            Add another bank
          </Button>
        </div>
      )}
    </div>
  );
}
