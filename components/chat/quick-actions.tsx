"use client";

import { Button } from "@/components/ui/button";
import { CreditCard, ChartPie, Target, PaperPlaneTilt } from "@phosphor-icons/react";

interface QuickActionsProps {
  onAction: (action: string) => void;
  hasBankConnected?: boolean;
}

export function QuickActions({ onAction, hasBankConnected = false }: QuickActionsProps) {
  const actions = hasBankConnected
    ? [
        { icon: CreditCard, label: "Accounts", action: "show-accounts" },
        { icon: ChartPie, label: "Spending", action: "show-spending" },
        { icon: Target, label: "Goals", action: "show-goals" },
        { icon: PaperPlaneTilt, label: "Send", action: "send-money" },
      ]
    : [
        { icon: CreditCard, label: "Connect Bank", action: "connect-bank" },
        { icon: ChartPie, label: "How it works", action: "how-it-works" },
        { icon: Target, label: "Features", action: "features" },
      ];

  return (
    <div className="flex items-center justify-center gap-2 px-4 py-3 border-t border-border/50">
      {actions.map((action) => (
        <Button
          key={action.action}
          variant="ghost"
          size="sm"
          className="flex flex-col items-center gap-1 h-auto py-2 px-3 text-muted-foreground hover:text-foreground"
          onClick={() => onAction(action.action)}
        >
          <action.icon size={16} />
          <span className="text-[10px]">{action.label}</span>
        </Button>
      ))}
    </div>
  );
}
