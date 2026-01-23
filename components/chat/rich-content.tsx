"use client";

import { MessageContent } from "@/lib/types";
import { BalanceCard } from "./cards/balance-card";
import { BankConnected } from "./cards/bank-connected";
import { SpendingAnalysis } from "./cards/spending-analysis";
import { BudgetCard } from "./cards/budget-card";
import { BudgetOverview } from "./cards/budget-overview";
import { TransactionsList } from "./cards/transactions-list";
import { ActionButtons } from "./cards/action-buttons";
import { AIModeIntro } from "./cards/ai-mode-intro";
import { FinancialHealth } from "./cards/financial-health";
import { CashFlow } from "./cards/cash-flow";
import { SavingsGoals } from "./cards/savings-goals";
import { RecurringExpenses } from "./cards/recurring-expenses";
import { SavingsGoalSetup } from "./cards/savings-goal-setup";

interface RichContentProps {
  content: MessageContent;
  onAction?: (action: string, data?: Record<string, unknown>) => void;
  disabled?: boolean;
}

export function RichContent({ content, onAction, disabled }: RichContentProps) {
  switch (content.type) {
    case "balance-card":
      return <BalanceCard data={content.data} />;

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

    case "transactions-list":
      return <TransactionsList data={content.data} onAction={onAction} disabled={disabled} />;

    case "action-buttons":
      return (
        <ActionButtons
          actions={content.data?.actions as Array<{ label: string; action: string; variant?: "default" | "outline" | "secondary" | "ghost"; data?: Record<string, unknown> }>}
          onAction={onAction}
          disabled={disabled}
        />
      );

    case "ai-mode-intro":
      return (
        <AIModeIntro
          onAction={onAction}
          disabled={disabled}
        />
      );

    case "financial-health":
      return (
        <FinancialHealth
          data={content.data}
          onAction={onAction}
          disabled={disabled}
        />
      );

    case "cash-flow":
      return (
        <CashFlow
          data={content.data}
          onAction={onAction}
          disabled={disabled}
        />
      );

    case "savings-goals":
      return (
        <SavingsGoals
          data={content.data}
          onAction={onAction}
          disabled={disabled}
        />
      );

    case "budget-overview":
      return (
        <BudgetOverview
          data={content.data}
          onAction={onAction}
          disabled={disabled}
        />
      );

    case "recurring-expenses":
      return (
        <RecurringExpenses
          data={content.data}
          onAction={onAction}
          disabled={disabled}
        />
      );

    case "savings-goal-setup":
      return (
        <SavingsGoalSetup
          data={content.data}
          onAction={onAction}
          disabled={disabled}
        />
      );

    default:
      return null;
  }
}
