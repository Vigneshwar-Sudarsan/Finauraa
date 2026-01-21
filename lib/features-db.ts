/**
 * Database-driven feature flags for Finauraa
 * Allows dynamic management of feature limits without code deployments
 *
 * Use this instead of lib/features.ts for dynamic feature management
 */

import { createClient } from "@/lib/supabase/server";
import { SubscriptionTier, TierLimits, TIER_LIMITS } from "./features";

// In-memory cache for feature flags
let featureFlagsCache: Map<string, FeatureFlag> | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export interface FeatureFlag {
  id: string;
  feature_key: string;
  feature_name: string;
  description: string | null;
  category: "usage_limit" | "boolean_feature" | "notification" | "ai" | "support";
  free_value: unknown;
  pro_value: unknown;
  family_value: unknown;
  value_type: "boolean" | "number" | "string" | "array";
  is_active: boolean;
}

/**
 * Fetch all feature flags from database with caching
 */
export async function getFeatureFlags(): Promise<Map<string, FeatureFlag>> {
  // Return cached data if still valid
  const now = Date.now();
  if (featureFlagsCache && (now - cacheTimestamp) < CACHE_TTL) {
    return featureFlagsCache;
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("feature_flags")
      .select("*")
      .eq("is_active", true);

    if (error) {
      console.error("Error fetching feature flags:", error);
      // Fall back to hardcoded values if database fails
      return convertStaticToMap();
    }

    // Build the cache map
    const flagsMap = new Map<string, FeatureFlag>();
    (data || []).forEach((flag: FeatureFlag) => {
      flagsMap.set(flag.feature_key, flag);
    });

    // Update cache
    featureFlagsCache = flagsMap;
    cacheTimestamp = now;

    return flagsMap;
  } catch (error) {
    console.error("Error in getFeatureFlags:", error);
    return convertStaticToMap();
  }
}

/**
 * Convert static TIER_LIMITS to a Map for fallback
 */
function convertStaticToMap(): Map<string, FeatureFlag> {
  const map = new Map<string, FeatureFlag>();
  const features = Object.keys(TIER_LIMITS.free) as (keyof TierLimits)[];

  features.forEach((key) => {
    const freeValue = TIER_LIMITS.free[key];
    const proValue = TIER_LIMITS.pro[key];
    const familyValue = TIER_LIMITS.family[key];

    let valueType: "boolean" | "number" | "string" | "array" = "boolean";
    if (typeof freeValue === "number" || freeValue === null) {
      valueType = "number";
    } else if (typeof freeValue === "string") {
      valueType = "string";
    } else if (Array.isArray(freeValue)) {
      valueType = "array";
    }

    map.set(key, {
      id: key,
      feature_key: key,
      feature_name: key,
      description: null,
      category: "boolean_feature",
      free_value: freeValue,
      pro_value: proValue,
      family_value: familyValue,
      value_type: valueType,
      is_active: true,
    });
  });

  return map;
}

/**
 * Get the value of a specific feature for a tier from database
 */
export async function getFeatureValue<T>(
  featureKey: string,
  tier: SubscriptionTier
): Promise<T | null> {
  const flags = await getFeatureFlags();
  const flag = flags.get(featureKey);

  if (!flag) {
    // Fall back to static config
    const staticValue = TIER_LIMITS[tier]?.[featureKey as keyof TierLimits];
    return staticValue as T | null;
  }

  switch (tier) {
    case "free":
      return flag.free_value as T;
    case "pro":
      return flag.pro_value as T;
    case "family":
      return flag.family_value as T;
    default:
      return flag.free_value as T;
  }
}

/**
 * Get all limits for a tier from database
 * Falls back to static config if database unavailable
 */
export async function getDynamicTierLimits(tier: SubscriptionTier): Promise<TierLimits> {
  const flags = await getFeatureFlags();

  // Start with static defaults
  const limits = { ...TIER_LIMITS[tier] };

  // Override with database values
  flags.forEach((flag, key) => {
    if (key in limits) {
      switch (tier) {
        case "free":
          (limits as Record<string, unknown>)[key] = flag.free_value;
          break;
        case "pro":
          (limits as Record<string, unknown>)[key] = flag.pro_value;
          break;
        case "family":
          (limits as Record<string, unknown>)[key] = flag.family_value;
          break;
      }
    }
  });

  return limits;
}

/**
 * Check if a boolean feature is enabled for a tier
 */
export async function isFeatureEnabledDynamic(
  tier: SubscriptionTier,
  featureKey: string
): Promise<boolean> {
  const value = await getFeatureValue<boolean | number | unknown[] | null>(featureKey, tier);

  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return value > 0;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  if (value === null) {
    return true; // null means unlimited
  }
  return true;
}

/**
 * Check usage limit for a tier
 */
export async function checkDynamicLimit(
  tier: SubscriptionTier,
  featureKey: string,
  currentUsage: number
): Promise<{
  allowed: boolean;
  limit: number | null;
  used: number;
  remaining: number | null;
}> {
  const limit = await getFeatureValue<number | null>(featureKey, tier);

  // null means unlimited
  if (limit === null) {
    return {
      allowed: true,
      limit: null,
      used: currentUsage,
      remaining: null,
    };
  }

  const allowed = currentUsage < limit;
  return {
    allowed,
    limit,
    used: currentUsage,
    remaining: limit - currentUsage,
  };
}

/**
 * Invalidate the feature flags cache
 * Call this after updating feature flags
 */
export function invalidateFeatureFlagsCache(): void {
  featureFlagsCache = null;
  cacheTimestamp = 0;
}

/**
 * Get all feature flags grouped by category (for admin panel)
 */
export async function getFeatureFlagsByCategory(): Promise<Record<string, FeatureFlag[]>> {
  const flags = await getFeatureFlags();
  const grouped: Record<string, FeatureFlag[]> = {};

  flags.forEach((flag) => {
    const category = flag.category || "general";
    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push(flag);
  });

  return grouped;
}
