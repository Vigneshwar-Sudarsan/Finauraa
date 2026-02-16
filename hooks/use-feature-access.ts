"use client";

import { useCallback } from "react";
import {
  SubscriptionTier,
  TierLimits,
  FeatureCheck,
  getTierLimits,
  checkFeatureAccess,
  checkUsageLimit,
  isFeatureAvailable,
  hasFamilyFeatures,
} from "@/lib/features";
import { useProfile } from "@/hooks/use-profile";

interface UsageState {
  bankConnections: number;
  aiQueries: number;
  savingsGoals: number;
  familyMembers: number;
}

interface FeatureAccessHook {
  // Subscription state
  tier: SubscriptionTier;
  status: string;
  isLoading: boolean;
  error: string | null;
  limits: TierLimits;

  // Usage state
  usage: UsageState;

  // Helper functions
  canAccess: (feature: keyof TierLimits) => boolean;
  checkFeature: (feature: keyof TierLimits) => FeatureCheck;
  checkLimit: (
    feature: "bankConnections" | "aiQueriesPerMonth" | "savingsGoals" | "spendingLimits" | "familyMembers",
    currentUsage?: number
  ) => FeatureCheck;
  isPro: boolean;
  isFamily: boolean;
  isFree: boolean;
  canAccessFamilyFeatures: boolean;

  // Refresh
  refresh: () => Promise<void>;
}

/**
 * Hook for checking feature access based on subscription tier.
 *
 * Reads tier from the profiles table (kept in sync by Stripe webhooks).
 * No API calls on mount — server-side routes enforce actual limits.
 * Call refresh() to re-fetch from /api/subscription if needed (e.g., after payment).
 */
export function useFeatureAccess(): FeatureAccessHook {
  const { profile, isLoading: profileLoading, isError, mutate } = useProfile();

  const tier = (profile?.subscription_tier || "free") as SubscriptionTier;

  // Usage is tracked server-side; client defaults to 0
  // Server-side API routes enforce real limits on gated actions
  const usage: UsageState = {
    bankConnections: 0,
    aiQueries: 0,
    savingsGoals: 0,
    familyMembers: 0,
  };

  const limits = getTierLimits(tier);

  const canAccess = useCallback(
    (feature: keyof TierLimits): boolean => {
      return isFeatureAvailable(tier, feature);
    },
    [tier]
  );

  const checkFeature = useCallback(
    (feature: keyof TierLimits): FeatureCheck => {
      return checkFeatureAccess(tier, feature);
    },
    [tier]
  );

  const checkLimit = useCallback(
    (
      feature: "bankConnections" | "aiQueriesPerMonth" | "savingsGoals" | "spendingLimits" | "familyMembers",
      currentUsage?: number
    ): FeatureCheck => {
      const usageMap: Record<string, keyof UsageState> = {
        bankConnections: "bankConnections",
        aiQueriesPerMonth: "aiQueries",
        savingsGoals: "savingsGoals",
        spendingLimits: "savingsGoals",
        familyMembers: "familyMembers",
      };

      const usageKey = usageMap[feature];
      const used = currentUsage ?? usage[usageKey];

      return checkUsageLimit(tier, feature, used);
    },
    [tier, usage]
  );

  const refresh = useCallback(async () => {
    mutate();
  }, [mutate]);

  return {
    tier,
    status: "active",
    isLoading: profileLoading,
    error: isError ? "Failed to load profile" : null,
    limits,
    usage,
    canAccess,
    checkFeature,
    checkLimit,
    isPro: tier === "pro",
    isFamily: tier === "family",
    isFree: tier === "free",
    canAccessFamilyFeatures: hasFamilyFeatures(tier),
    refresh,
  };
}
