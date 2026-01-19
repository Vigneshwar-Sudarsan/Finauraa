"use client";

import { cn } from "@/lib/utils";
import { Button } from "./button";

interface EmptyStateAction {
  label: string;
  onClick: () => void;
  variant?: "default" | "outline" | "secondary" | "ghost";
  loading?: boolean;
}

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 px-6 text-center",
        className
      )}
    >
      <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="font-semibold text-lg mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-xs mb-6">
        {description}
      </p>
      {(action || secondaryAction) && (
        <div className="flex flex-col sm:flex-row gap-2">
          {action && (
            <Button
              onClick={action.onClick}
              variant={action.variant ?? "default"}
              disabled={action.loading}
            >
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              onClick={secondaryAction.onClick}
              variant={secondaryAction.variant ?? "outline"}
              disabled={secondaryAction.loading}
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
