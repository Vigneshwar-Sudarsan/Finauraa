"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import {
  CheckCircle,
  Warning,
  Info,
  XCircle,
} from "@phosphor-icons/react";

type AlertType = "success" | "warning" | "error" | "info";

interface StatusAlertProps {
  /** The type/severity of the alert */
  type: AlertType;
  /** Title of the alert */
  title?: string;
  /** Description/message of the alert */
  description?: string | ReactNode;
  /** Optional: Custom icon (overrides default) */
  icon?: ReactNode;
  /** Optional: Action button/element */
  action?: ReactNode;
  /** Optional: Show as inline (smaller padding) */
  inline?: boolean;
  /** Optional: Additional classes */
  className?: string;
  /** Optional: Children content */
  children?: ReactNode;
}

/**
 * Status alert component for displaying error, warning, success, and info messages
 *
 * @example
 * ```tsx
 * <StatusAlert
 *   type="error"
 *   title="Payment Failed"
 *   description="Please update your payment method"
 *   action={<Button>Update Payment</Button>}
 * />
 *
 * <StatusAlert type="warning" inline>
 *   Your trial ends in 3 days
 * </StatusAlert>
 * ```
 */
export function StatusAlert({
  type,
  title,
  description,
  icon,
  action,
  inline = false,
  className,
  children,
}: StatusAlertProps) {
  const config: Record<
    AlertType,
    {
      borderClass: string;
      bgClass: string;
      iconClass: string;
      titleClass: string;
      textClass: string;
      icon: ReactNode;
    }
  > = {
    success: {
      borderClass: "border-green-500/50",
      bgClass: "bg-green-500/10",
      iconClass: "text-green-600",
      titleClass: "text-green-800 dark:text-green-400",
      textClass: "text-green-700 dark:text-green-500",
      icon: <CheckCircle size={24} weight="fill" />,
    },
    warning: {
      borderClass: "border-yellow-500/50",
      bgClass: "bg-yellow-500/10",
      iconClass: "text-yellow-600",
      titleClass: "text-yellow-800 dark:text-yellow-400",
      textClass: "text-yellow-700 dark:text-yellow-500",
      icon: <Warning size={24} weight="fill" />,
    },
    error: {
      borderClass: "border-red-500/50",
      bgClass: "bg-red-500/10",
      iconClass: "text-red-600",
      titleClass: "text-red-800 dark:text-red-400",
      textClass: "text-red-700 dark:text-red-500",
      icon: <XCircle size={24} weight="fill" />,
    },
    info: {
      borderClass: "border-blue-500/50",
      bgClass: "bg-blue-500/10",
      iconClass: "text-blue-600",
      titleClass: "text-blue-800 dark:text-blue-400",
      textClass: "text-blue-700 dark:text-blue-500",
      icon: <Info size={24} weight="fill" />,
    },
  };

  const alertConfig = config[type];

  // Inline variant - simpler display
  if (inline) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 text-sm p-3 rounded-lg",
          alertConfig.bgClass,
          alertConfig.textClass,
          className
        )}
      >
        <span className={alertConfig.iconClass}>
          {icon || (
            type === "error" ? (
              <Warning size={16} />
            ) : type === "warning" ? (
              <Warning size={16} />
            ) : type === "success" ? (
              <CheckCircle size={16} />
            ) : (
              <Info size={16} />
            )
          )}
        </span>
        {children || description}
      </div>
    );
  }

  // Card variant - full display
  return (
    <Card className={cn(alertConfig.borderClass, alertConfig.bgClass, className)}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <span className={cn("shrink-0", alertConfig.iconClass)}>
            {icon || alertConfig.icon}
          </span>
          <div className="flex-1 min-w-0">
            {title && (
              <p className={cn("font-medium", alertConfig.titleClass)}>
                {title}
              </p>
            )}
            {description && (
              <p className={cn("text-sm", title ? "mt-1" : "", alertConfig.textClass)}>
                {description}
              </p>
            )}
            {children && (
              <div className={cn("text-sm", title || description ? "mt-1" : "", alertConfig.textClass)}>
                {children}
              </div>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      </CardContent>
    </Card>
  );
}

interface InlineErrorProps {
  /** Error message to display */
  message: string | null | undefined;
  /** Optional: Additional classes */
  className?: string;
}

/**
 * Simple inline error display for forms
 *
 * @example
 * ```tsx
 * <InlineError message={error} />
 * ```
 */
export function InlineError({ message, className }: InlineErrorProps) {
  if (!message) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg",
        className
      )}
    >
      <Warning size={16} />
      {message}
    </div>
  );
}
