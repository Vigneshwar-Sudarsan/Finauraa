"use client";

import { useState, useEffect, useCallback } from "react";
import {
  SubscriptionTier,
  TierLimits,
  FeatureCheck,
  getTierLimits,
  checkFeatureAccess,
  checkUsageLimit,
  isFeatureAvailable,
} from "@/lib/features";

interface SubscriptionState {
  tier: SubscriptionTier;
  status: "active" | "canceled" | "past_due" | "trialing";
  isLoading: boolean;
  error: string | null;
}

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
    feature: "bankConnections" | "aiQueriesPerMonth" | "savingsGoals" | "familyMembers",
    currentUsage?: number
  ) => FeatureCheck;
  isPro: boolean;
  isFamily: boolean;
  isFree: boolean;

  // Refresh
  refresh: () => Promise<void>;
}

/**
 * Hook for checking feature access based on subscription tier
 * Use this throughout the app to gate features
 */
export function useFeatureAccess(): FeatureAccessHook {
  const [subscription, setSubscription] = useState<SubscriptionState>({
    tier: "free",
    status: "active",
    isLoading: true,
    error: null,
  });

  const [usage, setUsage] = useState<UsageState>({
    bankConnections: 0,
    aiQueries: 0,
    savingsGoals: 0,
    familyMembers: 0,
  });

  const fetchSubscription = useCallback(async () => {
    try {
      setSubscription((prev) => ({ ...prev, isLoading: true, error: null }));

      const response = await fetch("/api/subscription");
      if (!response.ok) {
        throw new Error("Failed to fetch subscription");
      }

      const data = await response.json();

      setSubscription({
        tier: data.subscription.tier || "free",
        status: data.subscription.status || "active",
        isLoading: false,
        error: null,
      });

      setUsage({
        bankConnections: data.usage?.bankConnections?.used || 0,
        aiQueries: data.usage?.aiQueries?.used || 0,
        savingsGoals: 0, // TODO: Add to API response
        familyMembers: 0, // TODO: Add to API response
      });
    } catch (error) {
      setSubscription((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }));
    }
  }, []);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const limits = getTierLimits(subscription.tier);

  const canAccess = useCallback(
    (feature: keyof TierLimits): boolean => {
      return isFeatureAvailable(subscription.tier, feature);
    },
    [subscription.tier]
  );

  const checkFeature = useCallback(
    (feature: keyof TierLimits): FeatureCheck => {
      return checkFeatureAccess(subscription.tier, feature);
    },
    [subscription.tier]
  );

  const checkLimit = useCallback(
    (
      feature: "bankConnections" | "aiQueriesPerMonth" | "savingsGoals" | "familyMembers",
      currentUsage?: number
    ): FeatureCheck => {
      // Map feature names to usage keys
      const usageMap: Record<string, keyof UsageState> = {
        bankConnections: "bankConnections",
        aiQueriesPerMonth: "aiQueries",
        savingsGoals: "savingsGoals",
        familyMembers: "familyMembers",
      };

      const usageKey = usageMap[feature];
      const used = currentUsage ?? usage[usageKey];

      return checkUsageLimit(subscription.tier, feature, used);
    },
    [subscription.tier, usage]
  );

  return {
    tier: subscription.tier,
    status: subscription.status,
    isLoading: subscription.isLoading,
    error: subscription.error,
    limits,
    usage,
    canAccess,
    checkFeature,
    checkLimit,
    isPro: subscription.tier === "pro",
    isFamily: subscription.tier === "family",
    isFree: subscription.tier === "free",
    refresh: fetchSubscription,
  };
}
