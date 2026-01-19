"use client";

import { Button } from "@/components/ui/button";
import { Check } from "@phosphor-icons/react";

interface ActionButtonsProps {
  actions?: Array<{
    label: string;
    action: string;
    variant?: "default" | "outline" | "secondary" | "ghost";
    data?: Record<string, unknown>;
  }>;
  onAction?: (action: string, data?: Record<string, unknown>) => void;
  disabled?: boolean;
}

export function ActionButtons({ actions = [], onAction, disabled }: ActionButtonsProps) {
  if (actions.length === 0) return null;

  // If disabled, show a completed state instead of buttons
  if (disabled) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2">
        <Check size={14} weight="bold" />
        <span>Completed</span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {actions.map((action, index) => (
        <Button
          key={index}
          size="sm"
          variant={action.variant ?? (index === 0 ? "default" : "outline")}
          onClick={() => onAction?.(action.action, action.data)}
        >
          {action.label}
        </Button>
      ))}
    </div>
  );
}
