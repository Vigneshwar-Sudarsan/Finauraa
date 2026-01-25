import { createClient } from "@/lib/supabase/server";
import {
  SubscriptionTier,
  TierLimits,
  FeatureCheck,
  getTierLimits,
  checkFeatureAccess,
  checkUsageLimit,
  isFeatureAvailable,
  getTransactionHistoryDate,
} from "@/lib/features";
import {
  getDynamicTierLimits,
  isFeatureEnabledDynamic,
  checkDynamicLimit,
  getFeatureValue,
} from "@/lib/features-db";

// Feature to enable dynamic feature flags from database
// Set to true to use database-driven limits, false for static config
const USE_DYNAMIC_FEATURES = process.env.USE_DYNAMIC_FEATURES === "true";

export interface UserSubscription {
  userId: string;
  tier: SubscriptionTier;
  status: "active" | "canceled" | "past_due" | "trialing";
  limits: TierLimits;
  familyGroupId?: string;
}

/**
 * Get user's subscription tier from the database
 * Use this in API routes and server components
 *
 * IMPORTANT: Family group members inherit Pro features even if their own tier is "free"
 * This function returns the EFFECTIVE tier after considering family membership
 */
export async function getUserSubscription(): Promise<UserSubscription | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("subscription_tier, subscription_status, is_pro, family_group_id")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    // Default to free tier if profile not found
    return {
      userId: user.id,
      tier: "free",
      status: "active",
      limits: getTierLimits("free"),
    };
  }

  // Determine base tier (with backwards compatibility for is_pro)
  let tier: SubscriptionTier =
    profile.subscription_tier || (profile.is_pro ? "pro" : "free");

  // Check if user is part of a family group - they inherit Pro features
  // Family members get upgraded to "pro" effective tier regardless of their own subscription
  if (profile.family_group_id && tier === "free") {
    // Verify the user is an active member of the family group
    const { data: membership } = await supabase
      .from("family_members")
      .select("status")
      .eq("group_id", profile.family_group_id)
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (membership) {
      // User is an active family member - they get Pro features
      tier = "pro";
    }
  }

  // Use dynamic limits from database if enabled
  const limits = USE_DYNAMIC_FEATURES
    ? await getDynamicTierLimits(tier)
    : getTierLimits(tier);

  return {
    userId: user.id,
    tier,
    status: profile.subscription_status || "active",
    limits,
    familyGroupId: profile.family_group_id || undefined,
  };
}

/**
 * Check if user can perform an action that has a limit
 * Returns usage info and whether action is allowed
 */
export async function checkUserLimit(
  feature: "bankConnections" | "aiQueriesPerMonth" | "savingsGoals"
): Promise<FeatureCheck & { userId?: string; tier?: SubscriptionTier }> {
  const subscription = await getUserSubscription();

  if (!subscription) {
    return {
      allowed: false,
      reason: "User not authenticated",
    };
  }

  const supabase = await createClient();
  let currentUsage = 0;

  switch (feature) {
    case "bankConnections": {
      const { count } = await supabase
        .from("bank_connections")
        .select("id", { count: "exact", head: true })
        .eq("user_id", subscription.userId)
        .eq("status", "active");
      currentUsage = count || 0;
      break;
    }

    case "aiQueriesPerMonth": {
      // Count AI queries this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("role", "user")
        .gte("created_at", startOfMonth.toISOString());
      // Note: This counts all user messages. You may need to filter by user_id
      // depending on your schema
      currentUsage = count || 0;
      break;
    }

    case "savingsGoals": {
      const { count } = await supabase
        .from("savings_goals")
        .select("id", { count: "exact", head: true })
        .eq("user_id", subscription.userId);
      currentUsage = count || 0;
      break;
    }
  }

  const result = checkUsageLimit(subscription.tier, feature, currentUsage);

  return {
    ...result,
    userId: subscription.userId,
    tier: subscription.tier,
  };
}

/**
 * Check if user has access to a boolean feature
 */
export async function checkUserFeature(
  feature: keyof TierLimits
): Promise<FeatureCheck & { userId?: string; tier?: SubscriptionTier }> {
  const subscription = await getUserSubscription();

  if (!subscription) {
    return {
      allowed: false,
      reason: "User not authenticated",
    };
  }

  const result = checkFeatureAccess(subscription.tier, feature);

  return {
    ...result,
    userId: subscription.userId,
    tier: subscription.tier,
  };
}

/**
 * Guard function for API routes - throws if feature not available
 * Use at the start of API routes to gate access
 */
export async function requireFeature(feature: keyof TierLimits): Promise<UserSubscription> {
  const subscription = await getUserSubscription();

  if (!subscription) {
    throw new FeatureError("Unauthorized", 401);
  }

  // Check feature availability - use dynamic or static based on config
  const featureAvailable = USE_DYNAMIC_FEATURES
    ? await isFeatureEnabledDynamic(subscription.tier, feature)
    : isFeatureAvailable(subscription.tier, feature);

  if (!featureAvailable) {
    throw new FeatureError(
      `This feature requires a ${subscription.tier === "free" ? "Pro" : "Family"} plan`,
      403,
      feature
    );
  }

  return subscription;
}

/**
 * Guard function for API routes - throws if limit exceeded
 */
export async function requireWithinLimit(
  feature: "bankConnections" | "aiQueriesPerMonth" | "savingsGoals"
): Promise<UserSubscription & { currentUsage: number }> {
  const result = await checkUserLimit(feature);

  if (!result.userId || !result.tier) {
    throw new FeatureError("Unauthorized", 401);
  }

  if (!result.allowed) {
    throw new FeatureError(
      result.reason || "Limit exceeded",
      403,
      feature,
      result.limit,
      result.used
    );
  }

  return {
    userId: result.userId,
    tier: result.tier,
    status: "active",
    limits: getTierLimits(result.tier),
    currentUsage: result.used || 0,
  };
}

/**
 * Get transaction date filter based on user's tier
 */
export async function getTransactionDateFilter(): Promise<{
  dateFilter: Date | null;
  tier: SubscriptionTier;
}> {
  const subscription = await getUserSubscription();
  const tier = subscription?.tier || "free";

  // Use dynamic or static based on config
  if (USE_DYNAMIC_FEATURES) {
    const historyDays = await getFeatureValue<number | null>("transactionHistoryDays", tier);
    if (historyDays === null) {
      return { dateFilter: null, tier };
    }
    const date = new Date();
    date.setDate(date.getDate() - historyDays);
    return { dateFilter: date, tier };
  }

  return {
    dateFilter: getTransactionHistoryDate(tier),
    tier,
  };
}

/**
 * Check dynamic limit for a feature
 * Supports both database-driven and static limits
 */
export async function checkDynamicFeatureLimit(
  tier: SubscriptionTier,
  featureKey: string,
  currentUsage: number
): Promise<{
  allowed: boolean;
  limit: number | null;
  used: number;
  remaining: number | null;
}> {
  if (USE_DYNAMIC_FEATURES) {
    return checkDynamicLimit(tier, featureKey, currentUsage);
  }

  // Fall back to static limits
  const limits = getTierLimits(tier);
  const staticLimit = limits[featureKey as keyof TierLimits];

  if (staticLimit === null || staticLimit === undefined) {
    return { allowed: true, limit: null, used: currentUsage, remaining: null };
  }

  if (typeof staticLimit === "number") {
    return {
      allowed: currentUsage < staticLimit,
      limit: staticLimit,
      used: currentUsage,
      remaining: staticLimit - currentUsage,
    };
  }

  return { allowed: true, limit: null, used: currentUsage, remaining: null };
}

/**
 * Custom error class for feature gating
 */
export class FeatureError extends Error {
  constructor(
    message: string,
    public statusCode: number = 403,
    public feature?: string,
    public limit?: number,
    public used?: number
  ) {
    super(message);
    this.name = "FeatureError";
  }

  toJSON() {
    return {
      error: this.message,
      feature: this.feature,
      limit: this.limit,
      used: this.used,
      upgradeRequired: true,
    };
  }
}
