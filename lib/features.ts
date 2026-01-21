/**
 * Feature gating configuration for Finauraa
 * Controls which features are available per subscription tier
 */

export type SubscriptionTier = "free" | "pro" | "family";

export interface TierLimits {
  // Usage limits
  bankConnections: number;
  aiQueriesPerMonth: number;
  transactionHistoryDays: number | null; // null = unlimited
  savingsGoals: number | null; // null = unlimited
  familyMembers: number;

  // Core features
  syncFrequency: "manual" | "daily";
  exports: boolean;
  exportFormats: ("csv" | "pdf")[];

  // AI features
  enhancedAI: boolean; // Requires additional consent
  advancedInsights: boolean;

  // Notification features
  budgetAlerts: boolean;
  billReminders: boolean;
  goalProgressAlerts: boolean;
  aiInsightsNotifications: boolean;

  // Support & premium features
  prioritySupport: boolean;
  familyDashboard: boolean;
}

export interface FeatureCheck {
  allowed: boolean;
  reason?: string;
  upgradeRequired?: SubscriptionTier;
  limit?: number;
  used?: number;
}

/**
 * Feature limits per subscription tier
 * Source of truth for all feature gating in the app
 */
export const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
  free: {
    // Usage limits
    bankConnections: 1,
    aiQueriesPerMonth: 5,
    transactionHistoryDays: 30,
    savingsGoals: 3,
    familyMembers: 0,

    // Core features
    syncFrequency: "manual",
    exports: false,
    exportFormats: [],

    // AI features
    enhancedAI: false,
    advancedInsights: false,

    // Notification features
    budgetAlerts: false,
    billReminders: false,
    goalProgressAlerts: false,
    aiInsightsNotifications: false,

    // Support & premium features
    prioritySupport: false,
    familyDashboard: false,
  },
  pro: {
    // Usage limits
    bankConnections: 5,
    aiQueriesPerMonth: 100,
    transactionHistoryDays: null, // unlimited
    savingsGoals: null, // unlimited
    familyMembers: 0,

    // Core features
    syncFrequency: "daily",
    exports: true,
    exportFormats: ["csv", "pdf"],

    // AI features
    enhancedAI: true,
    advancedInsights: true,

    // Notification features
    budgetAlerts: true,
    billReminders: true,
    goalProgressAlerts: true,
    aiInsightsNotifications: true,

    // Support & premium features
    prioritySupport: true,
    familyDashboard: false,
  },
  family: {
    // Usage limits
    bankConnections: 15, // shared
    aiQueriesPerMonth: 200, // shared
    transactionHistoryDays: null, // unlimited
    savingsGoals: null, // unlimited
    familyMembers: 7,

    // Core features
    syncFrequency: "daily",
    exports: true,
    exportFormats: ["csv", "pdf"],

    // AI features
    enhancedAI: true,
    advancedInsights: true,

    // Notification features
    budgetAlerts: true,
    billReminders: true,
    goalProgressAlerts: true,
    aiInsightsNotifications: true,

    // Support & premium features
    prioritySupport: true,
    familyDashboard: true,
  },
};

/**
 * Feature names for display
 */
export const FEATURE_NAMES: Record<keyof TierLimits, string> = {
  // Usage limits
  bankConnections: "Bank Connections",
  aiQueriesPerMonth: "AI Queries",
  transactionHistoryDays: "Transaction History",
  savingsGoals: "Savings Goals",
  familyMembers: "Family Members",

  // Core features
  syncFrequency: "Sync Frequency",
  exports: "Data Export",
  exportFormats: "Export Formats",

  // AI features
  enhancedAI: "Enhanced AI",
  advancedInsights: "Advanced Insights",

  // Notification features
  budgetAlerts: "Budget Alerts",
  billReminders: "Bill Reminders",
  goalProgressAlerts: "Goal Progress Alerts",
  aiInsightsNotifications: "AI Insights Notifications",

  // Support & premium features
  prioritySupport: "Priority Support",
  familyDashboard: "Family Dashboard",
};

/**
 * Notification feature mapping
 * Maps notification IDs to their required features
 */
export const NOTIFICATION_FEATURES: Record<string, keyof TierLimits | null> = {
  // Free features (null = no restriction)
  email: null,
  push: null,
  spending_alerts: null,
  large_transactions: null,
  low_balance: null,
  weekly_digest: null,
  monthly_report: null,

  // Pro features
  bill_reminders: "billReminders",
  goal_progress: "goalProgressAlerts",
  ai_insights: "aiInsightsNotifications",
};

/**
 * Get limits for a specific tier
 */
export function getTierLimits(tier: SubscriptionTier): TierLimits {
  return TIER_LIMITS[tier] || TIER_LIMITS.free;
}

/**
 * Check if a feature is available for a tier
 */
export function isFeatureAvailable(
  tier: SubscriptionTier,
  feature: keyof TierLimits
): boolean {
  const limits = getTierLimits(tier);
  const value = limits[feature];

  // Boolean features
  if (typeof value === "boolean") {
    return value;
  }

  // Numeric features (0 means not available)
  if (typeof value === "number") {
    return value > 0;
  }

  // Array features (empty means not available)
  if (Array.isArray(value)) {
    return value.length > 0;
  }

  // null means unlimited (available)
  if (value === null) {
    return true;
  }

  // String features (manual vs daily)
  return true;
}

/**
 * Check if usage is within limits
 */
export function checkUsageLimit(
  tier: SubscriptionTier,
  feature: "bankConnections" | "aiQueriesPerMonth" | "savingsGoals" | "familyMembers",
  currentUsage: number
): FeatureCheck {
  const limits = getTierLimits(tier);
  const limit = limits[feature];

  // null means unlimited
  if (limit === null) {
    return { allowed: true };
  }

  if (currentUsage >= limit) {
    // Determine which tier unlocks more
    const upgradeRequired = tier === "free" ? "pro" : tier === "pro" ? "family" : undefined;

    return {
      allowed: false,
      reason: `You've reached your ${FEATURE_NAMES[feature].toLowerCase()} limit`,
      upgradeRequired,
      limit,
      used: currentUsage,
    };
  }

  return {
    allowed: true,
    limit,
    used: currentUsage,
  };
}

/**
 * Check if a boolean feature is enabled for the tier
 */
export function checkFeatureAccess(
  tier: SubscriptionTier,
  feature: keyof TierLimits
): FeatureCheck {
  const available = isFeatureAvailable(tier, feature);

  if (!available) {
    // Find the minimum tier that has this feature
    const tiers: SubscriptionTier[] = ["free", "pro", "family"];
    const upgradeRequired = tiers.find((t) => isFeatureAvailable(t, feature));

    return {
      allowed: false,
      reason: `${FEATURE_NAMES[feature]} requires a ${upgradeRequired} plan`,
      upgradeRequired: upgradeRequired as SubscriptionTier,
    };
  }

  return { allowed: true };
}

/**
 * Get transaction history date limit based on tier
 */
export function getTransactionHistoryDate(tier: SubscriptionTier): Date | null {
  const limits = getTierLimits(tier);

  if (limits.transactionHistoryDays === null) {
    return null; // No limit
  }

  const date = new Date();
  date.setDate(date.getDate() - limits.transactionHistoryDays);
  return date;
}

/**
 * Get the minimum tier required for a feature
 */
export function getRequiredTier(feature: keyof TierLimits): SubscriptionTier {
  const tiers: SubscriptionTier[] = ["free", "pro", "family"];
  return tiers.find((t) => isFeatureAvailable(t, feature)) || "family";
}
