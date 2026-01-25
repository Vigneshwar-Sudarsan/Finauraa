"use client";

import { cn } from "@/lib/utils";
import { Crown, Check, Warning, Clock, X } from "@phosphor-icons/react";

export type SubscriptionTierType = "free" | "pro" | "family";
export type SubscriptionStatusType =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "canceling"
  | "paused"
  | "incomplete";

interface TierBadgeProps {
  /** The subscription tier to display */
  tier: SubscriptionTierType;
  /** Optional: Show icon alongside text */
  showIcon?: boolean;
  /** Optional: Size variant */
  size?: "sm" | "md" | "lg";
  /** Optional: Additional classes */
  className?: string;
}

/**
 * Badge component for displaying subscription tier
 * Both "pro" and "family" tiers display as "Pro" since family was merged
 *
 * @example
 * ```tsx
 * <TierBadge tier="pro" />
 * <TierBadge tier="free" showIcon />
 * ```
 */
export function TierBadge({
  tier,
  showIcon = false,
  size = "sm",
  className,
}: TierBadgeProps) {
  // Both pro and family display as "Pro"
  const displayTier = tier === "family" ? "pro" : tier;
  const isPro = displayTier === "pro";

  const sizeClasses = {
    sm: "text-[10px] px-1.5 py-0.5",
    md: "text-xs px-2 py-1",
    lg: "text-sm px-2.5 py-1",
  };

  const iconSizes = {
    sm: 10,
    md: 12,
    lg: 14,
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded font-medium",
        sizeClasses[size],
        isPro
          ? "bg-primary/10 text-primary"
          : "bg-muted text-muted-foreground",
        className
      )}
    >
      {showIcon && isPro && (
        <Crown size={iconSizes[size]} weight="fill" />
      )}
      {isPro ? "Pro" : "Free"}
    </span>
  );
}

interface StatusBadgeProps {
  /** The subscription status to display */
  status: SubscriptionStatusType;
  /** Optional: Size variant */
  size?: "sm" | "md" | "lg";
  /** Optional: Additional classes */
  className?: string;
}

/**
 * Badge component for displaying subscription status
 *
 * @example
 * ```tsx
 * <StatusBadge status="active" />
 * <StatusBadge status="past_due" size="md" />
 * ```
 */
export function StatusBadge({ status, size = "sm", className }: StatusBadgeProps) {
  const sizeClasses = {
    sm: "text-[10px] px-1.5 py-0.5",
    md: "text-xs px-2 py-1",
    lg: "text-sm px-2.5 py-1",
  };

  const iconSizes = {
    sm: 10,
    md: 12,
    lg: 14,
  };

  const statusConfig: Record<
    SubscriptionStatusType,
    { label: string; className: string; icon?: React.ReactNode }
  > = {
    active: {
      label: "Active",
      className: "bg-green-500/10 text-green-600",
      icon: <Check size={iconSizes[size]} weight="bold" />,
    },
    trialing: {
      label: "Trial",
      className: "bg-blue-500/10 text-blue-600",
      icon: <Clock size={iconSizes[size]} />,
    },
    past_due: {
      label: "Past Due",
      className: "bg-red-500/10 text-red-600",
      icon: <Warning size={iconSizes[size]} weight="fill" />,
    },
    canceled: {
      label: "Canceled",
      className: "bg-muted text-muted-foreground",
      icon: <X size={iconSizes[size]} />,
    },
    canceling: {
      label: "Canceling",
      className: "bg-yellow-500/10 text-yellow-600",
      icon: <Clock size={iconSizes[size]} />,
    },
    paused: {
      label: "Paused",
      className: "bg-muted text-muted-foreground",
      icon: <Clock size={iconSizes[size]} />,
    },
    incomplete: {
      label: "Incomplete",
      className: "bg-yellow-500/10 text-yellow-600",
      icon: <Warning size={iconSizes[size]} />,
    },
  };

  const config = statusConfig[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded font-medium",
        sizeClasses[size],
        config.className,
        className
      )}
    >
      {config.icon}
      {config.label}
    </span>
  );
}

interface SavingsBadgeProps {
  /** Percentage saved (e.g., 17 for 17%) */
  percentage?: number;
  /** Amount saved */
  amount?: number;
  /** Currency code */
  currency?: string;
  /** Optional: Size variant */
  size?: "sm" | "md" | "lg";
  /** Optional: Additional classes */
  className?: string;
}

/**
 * Badge for displaying savings/discount information
 *
 * @example
 * ```tsx
 * <SavingsBadge percentage={17} />
 * <SavingsBadge amount={15.89} currency="USD" />
 * ```
 */
export function SavingsBadge({
  percentage,
  amount,
  currency = "USD",
  size = "sm",
  className,
}: SavingsBadgeProps) {
  const sizeClasses = {
    sm: "text-[10px] px-1.5 py-0.5",
    md: "text-xs px-2 py-1",
    lg: "text-sm px-2.5 py-1",
  };

  let label = "";
  if (percentage) {
    label = `Save ${percentage}%`;
  } else if (amount) {
    label = `Save ${new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount)}`;
  }

  if (!label) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded font-medium bg-green-500/10 text-green-600",
        sizeClasses[size],
        className
      )}
    >
      {label}
    </span>
  );
}

interface FeatureBadgeProps {
  /** Label to display */
  label?: string;
  /** Optional: Show crown icon */
  showIcon?: boolean;
  /** Optional: Size variant */
  size?: "sm" | "md" | "lg";
  /** Optional: Variant */
  variant?: "default" | "popular" | "current";
  /** Optional: Additional classes */
  className?: string;
}

/**
 * Badge for feature indicators (Pro required, Most Popular, Current Plan, etc.)
 *
 * @example
 * ```tsx
 * <FeatureBadge label="Pro" showIcon />
 * <FeatureBadge variant="popular" />
 * <FeatureBadge variant="current" />
 * ```
 */
export function FeatureBadge({
  label,
  showIcon = false,
  size = "sm",
  variant = "default",
  className,
}: FeatureBadgeProps) {
  const sizeClasses = {
    sm: "text-[10px] px-1.5 py-0.5",
    md: "text-xs px-2 py-1",
    lg: "text-sm px-2.5 py-1",
  };

  const iconSizes = {
    sm: 10,
    md: 12,
    lg: 14,
  };

  const variantConfig = {
    default: {
      className: "bg-primary/10 text-primary",
      label: label || "Pro",
    },
    popular: {
      className: "bg-primary text-primary-foreground",
      label: label || "Most Popular",
    },
    current: {
      className: "bg-muted text-muted-foreground",
      label: label || "Current Plan",
    },
  };

  const config = variantConfig[variant];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded font-medium",
        sizeClasses[size],
        config.className,
        className
      )}
    >
      {showIcon && variant === "default" && (
        <Crown size={iconSizes[size]} weight="fill" />
      )}
      {config.label}
    </span>
  );
}
