"use client";

import { MessageContent } from "@/lib/types";
import { BalanceCard } from "./cards/balance-card";
import { SpendingCard } from "./cards/spending-card";
import { BankConnected } from "./cards/bank-connected";
import { SpendingAnalysis } from "./cards/spending-analysis";
import { BudgetCard } from "./cards/budget-card";
import { ActionButtons } from "./cards/action-buttons";

interface RichContentProps {
  content: MessageContent;
  onAction?: (action: string, data?: Record<string, unknown>) => void;
  disabled?: boolean;
}

export function RichContent({ content, onAction, disabled }: RichContentProps) {
  switch (content.type) {
    case "balance-card":
      return <BalanceCard data={content.data} />;

    case "spending-card":
      return <SpendingCard data={content.data} />;

    case "bank-connected":
      return (
        <BankConnected
          data={content.data}
          onAction={onAction}
          disabled={disabled}
        />
      );

    case "spending-analysis":
      return (
        <SpendingAnalysis
          data={content.data}
          onAction={onAction}
          disabled={disabled}
        />
      );

    case "budget-card":
      return <BudgetCard data={content.data} onAction={onAction} disabled={disabled} />;

    case "action-buttons":
      return (
        <ActionButtons
          actions={content.data?.actions as Array<{ label: string; action: string; variant?: "default" | "outline" | "secondary" | "ghost" }>}
          onAction={onAction}
          disabled={disabled}
        />
      );

    default:
      return null;
  }
}
