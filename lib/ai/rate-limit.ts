/**
 * Rate limiter using Supabase for persistence
 * Survives server restarts and works across all server instances
 */

import { createClient } from "@/lib/supabase/server";

export interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export interface DailyLimitConfig {
  freeLimit: number;
  proLimit: number;
}

/**
 * Check per-minute rate limit using Supabase
 * Uses atomic database operation to prevent race conditions
 */
export async function checkRateLimit(
  userId: string,
  config: RateLimitConfig = { maxRequests: 30, windowSeconds: 60 }
): Promise<RateLimitResult> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc("check_rate_limit", {
      p_user_id: userId,
      p_limit_type: "minute",
      p_max_count: config.maxRequests,
      p_window_seconds: config.windowSeconds,
    });

    if (error) {
      console.error("Rate limit check failed:", error);
      // Fail open - allow request but log the error
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetAt: Date.now() + config.windowSeconds * 1000,
      };
    }

    const result = data?.[0];
    return {
      allowed: result?.allowed ?? true,
      remaining: Math.max(0, config.maxRequests - (result?.current_count ?? 1)),
      resetAt: result?.reset_at ? new Date(result.reset_at).getTime() : Date.now() + config.windowSeconds * 1000,
    };
  } catch (error) {
    console.error("Rate limit error:", error);
    // Fail open on error
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: Date.now() + config.windowSeconds * 1000,
    };
  }
}

/**
 * Check daily query limit using Supabase
 * Free users: 50/day, Pro users: 500/day
 */
export async function checkDailyLimit(
  userId: string,
  isPro: boolean,
  config: DailyLimitConfig = { freeLimit: 50, proLimit: 500 }
): Promise<{ allowed: boolean; remaining: number; limit: number }> {
  const limit = isPro ? config.proLimit : config.freeLimit;

  try {
    const supabase = await createClient();

    // Daily window = 86400 seconds (24 hours)
    const { data, error } = await supabase.rpc("check_rate_limit", {
      p_user_id: userId,
      p_limit_type: "daily",
      p_max_count: limit,
      p_window_seconds: 86400,
    });

    if (error) {
      console.error("Daily limit check failed:", error);
      // Fail open
      return { allowed: true, remaining: limit - 1, limit };
    }

    const result = data?.[0];
    return {
      allowed: result?.allowed ?? true,
      remaining: Math.max(0, limit - (result?.current_count ?? 1)),
      limit,
    };
  } catch (error) {
    console.error("Daily limit error:", error);
    return { allowed: true, remaining: limit - 1, limit };
  }
}

/**
 * Get rate limit headers for response
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Remaining": result.remaining.toString(),
    "X-RateLimit-Reset": Math.ceil(result.resetAt / 1000).toString(),
  };
}
