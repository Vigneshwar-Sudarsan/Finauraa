/**
 * Feature gating configuration for Finauraa
 * Controls which features are available per subscription tier
 *
 * NOTE: Family features are now included in Pro tier (no separate Family tier)
 * The "family" tier is kept for backwards compatibility but maps to Pro features
 */

export type SubscriptionTier = "free" | "pro" | "family";

export interface TierLimits {
  // Usage limits
  bankConnections: number;
  aiQueriesPerMonth: number;
  transactionHistoryDays: number | null; // null = unlimited
  savingsGoals: number | null; // null = unlimited
  spendingLimits: number | null; // null = unlimited
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

  // Family features (now part of Pro)
  sharedGoals: boolean;
  sharedSpendingLimits: boolean;
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
 *
 * New simplified model (Jan 2026):
 * - Free: Basic features with limits
 * - Pro: Everything unlimited + Family features (up to 5 members)
 * - Family: Alias for Pro (backwards compatibility)
 */
export const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
  free: {
    // Usage limits
    bankConnections: 3,
    aiQueriesPerMonth: 5,
    transactionHistoryDays: 30,
    savingsGoals: 3,
    spendingLimits: 2,
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

    // Family features
    sharedGoals: false,
    sharedSpendingLimits: false,
  },
  pro: {
    // Usage limits
    bankConnections: -1, // -1 = unlimited
    aiQueriesPerMonth: -1, // -1 = unlimited
    transactionHistoryDays: null, // null = unlimited
    savingsGoals: null, // null = unlimited
    spendingLimits: null, // null = unlimited
    familyMembers: 5, // Including primary user

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

    // Family features
    sharedGoals: true,
    sharedSpendingLimits: true,
  },
  // Family tier is now an alias for Pro (backwards compatibility)
  // Users with "family" tier get the same features as Pro
  family: {
    // Usage limits
    bankConnections: -1,
    aiQueriesPerMonth: -1,
    transactionHistoryDays: null,
    savingsGoals: null,
    spendingLimits: null,
    familyMembers: 5,

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

    // Family features
    sharedGoals: true,
    sharedSpendingLimits: true,
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
  spendingLimits: "Spending Limits",
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

  // Family features
  sharedGoals: "Shared Goals",
  sharedSpendingLimits: "Shared Spending Limits",
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

  // Numeric features (0 means not available, -1 means unlimited)
  if (typeof value === "number") {
    return value !== 0;
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
  feature: "bankConnections" | "aiQueriesPerMonth" | "savingsGoals" | "spendingLimits" | "familyMembers",
  currentUsage: number
): FeatureCheck {
  const limits = getTierLimits(tier);
  const limit = limits[feature];

  // null or -1 means unlimited
  if (limit === null || limit === -1) {
    return { allowed: true };
  }

  if (currentUsage >= limit) {
    // Only free users need to upgrade (Pro has everything)
    const upgradeRequired = tier === "free" ? "pro" : undefined;

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
    // All premium features require Pro (family is now same as pro)
    return {
      allowed: false,
      reason: `${FEATURE_NAMES[feature]} requires a Pro plan`,
      upgradeRequired: "pro",
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
  // Check if free tier has this feature
  if (isFeatureAvailable("free", feature)) {
    return "free";
  }
  // Otherwise it requires Pro (family = pro now)
  return "pro";
}

/**
 * Check if a tier has family features enabled
 * Both "pro" and "family" tiers now have family features
 */
export function hasFamilyFeatures(tier: SubscriptionTier): boolean {
  return tier === "pro" || tier === "family";
}
