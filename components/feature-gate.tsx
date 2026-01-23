"use client";

import { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useFeatureAccess } from "@/hooks/use-feature-access";
import { TierLimits, FEATURE_NAMES, getRequiredTier } from "@/lib/features";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Lock, Crown } from "@phosphor-icons/react";

interface FeatureGateProps {
  /** The feature to check access for */
  feature: keyof TierLimits;
  /** Content to show when feature is available */
  children: ReactNode;
  /** Optional: Content to show when feature is locked (default: upgrade prompt) */
  fallback?: ReactNode;
  /** Optional: Show nothing instead of fallback */
  hideWhenLocked?: boolean;
  /** Optional: Show loading state */
  showLoading?: boolean;
}

/**
 * Component that gates content based on subscription tier
 * Wrap any feature-specific content with this component
 *
 * @example
 * ```tsx
 * <FeatureGate feature="exports">
 *   <ExportButton />
 * </FeatureGate>
 * ```
 */
export function FeatureGate({
  feature,
  children,
  fallback,
  hideWhenLocked = false,
  showLoading = false,
}: FeatureGateProps) {
  const { canAccess, isLoading, tier } = useFeatureAccess();
  const router = useRouter();

  if (isLoading && showLoading) {
    return (
      <div className="animate-pulse bg-muted rounded h-10 w-full" />
    );
  }

  if (canAccess(feature)) {
    return <>{children}</>;
  }

  if (hideWhenLocked) {
    return null;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  // Default fallback: show upgrade prompt
  const requiredTier = getRequiredTier(feature);
  const featureName = FEATURE_NAMES[feature];

  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center p-6 text-center">
        <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
          <Lock size={24} className="text-primary" />
        </div>
        <h3 className="font-semibold mb-1">{featureName}</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Upgrade to {requiredTier.charAt(0).toUpperCase() + requiredTier.slice(1)} to unlock this feature
        </p>
        <Button
          size="sm"
          onClick={() => router.push("/dashboard/settings/subscription/plans")}
        >
          <Crown size={16} className="mr-2" weight="fill" />
          Upgrade Plan
        </Button>
      </CardContent>
    </Card>
  );
}

interface LimitGateProps {
  /** The feature with a limit to check */
  feature: "bankConnections" | "aiQueriesPerMonth" | "savingsGoals" | "familyMembers";
  /** Content to show when within limits */
  children: ReactNode;
  /** Optional: Content to show when limit reached */
  fallback?: ReactNode;
  /** Optional: Show nothing instead of fallback */
  hideWhenLocked?: boolean;
}

/**
 * Component that gates content based on usage limits
 *
 * @example
 * ```tsx
 * <LimitGate feature="bankConnections">
 *   <AddBankButton />
 * </LimitGate>
 * ```
 */
export function LimitGate({
  feature,
  children,
  fallback,
  hideWhenLocked = false,
}: LimitGateProps) {
  const { checkLimit, tier } = useFeatureAccess();
  const router = useRouter();
  const result = checkLimit(feature);

  if (result.allowed) {
    return <>{children}</>;
  }

  if (hideWhenLocked) {
    return null;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  const featureName = FEATURE_NAMES[feature];

  return (
    <Card className="border-dashed border-amber-500/50 bg-amber-500/5">
      <CardContent className="flex flex-col items-center justify-center p-6 text-center">
        <div className="size-12 rounded-full bg-amber-500/10 flex items-center justify-center mb-3">
          <Lock size={24} className="text-amber-500" />
        </div>
        <h3 className="font-semibold mb-1">Limit Reached</h3>
        <p className="text-sm text-muted-foreground mb-2">
          You&apos;ve used {result.used} of {result.limit} {featureName.toLowerCase()}
        </p>
        {result.upgradeRequired && (
          <>
            <p className="text-sm text-muted-foreground mb-4">
              Upgrade to get more
            </p>
            <Button
              size="sm"
              variant="outline"
              className="border-amber-500/50 text-amber-600 hover:bg-amber-500/10"
              onClick={() => router.push("/dashboard/settings/subscription/plans")}
            >
              <Crown size={16} className="mr-2" weight="fill" />
              Upgrade Plan
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// Re-export from tier-badge for backwards compatibility
// New code should import directly from @/components/ui/tier-badge
export {
  TierBadge,
  StatusBadge,
  SavingsBadge,
  FeatureBadge,
  FeatureBadge as UpgradeBadge, // Alias for backwards compatibility
} from "@/components/ui/tier-badge";
