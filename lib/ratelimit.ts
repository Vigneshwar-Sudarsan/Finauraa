import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { RateLimiterMemory } from "rate-limiter-flexible";
import * as Sentry from "@sentry/nextjs";

// Supabase-based rate limiting (no additional services needed)
// Uses your existing Supabase database

let supabaseAdmin: ReturnType<typeof createClient> | null = null;

function getSupabaseAdmin() {
  if (!supabaseAdmin) {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return null;
    }
    supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }
  return supabaseAdmin;
}

// Rate limit configurations
export const rateLimitConfigs = {
  consent: { maxRequests: 10, windowMs: 60 * 1000 }, // 10 per minute
  dataExport: { maxRequests: 3, windowMs: 60 * 60 * 1000 }, // 3 per hour
  api: { maxRequests: 60, windowMs: 60 * 1000 }, // 60 per minute
  auth: { maxRequests: 5, windowMs: 15 * 60 * 1000 }, // 5 per 15 minutes
  familyInvite: { maxRequests: 10, windowMs: 60 * 60 * 1000 }, // 10 invites per hour
};

export type RateLimitType = keyof typeof rateLimitConfigs;

// In-memory fallback limiters with STRICTER limits (fail-closed)
// These activate when Supabase is unavailable to prevent abuse during outages
const inMemoryLimiters = {
  consent: new RateLimiterMemory({
    points: 5, // 5 per minute (vs 10 normal) - 2x stricter
    duration: 60,
  }),
  dataExport: new RateLimiterMemory({
    points: 1, // 1 per hour (vs 3 normal) - 3x stricter
    duration: 60 * 60,
  }),
  api: new RateLimiterMemory({
    points: 10, // 10 per minute (vs 60 normal) - 6x stricter
    duration: 60,
  }),
  auth: new RateLimiterMemory({
    points: 2, // 2 per 15 minutes (vs 5 normal) - 2.5x stricter
    duration: 15 * 60,
  }),
  familyInvite: new RateLimiterMemory({
    points: 4, // 4 per hour (vs 10 normal) - 2.5x stricter
    duration: 60 * 60,
  }),
};

/**
 * Check rate limit using Supabase
 * Returns null if allowed, or a NextResponse if rate limited
 */
export async function checkRateLimit(
  type: RateLimitType,
  userId: string
): Promise<NextResponse | null> {
  const supabase = getSupabaseAdmin();

  // If Supabase not configured, use in-memory fallback (fail-closed)
  if (!supabase) {
    console.warn("Supabase not configured, using in-memory rate limiter");
    return checkInMemoryRateLimit(type, userId);
  }

  const config = rateLimitConfigs[type];
  const windowStart = new Date(Date.now() - config.windowMs);

  try {
    // Check for existing rate limit record in current window
    const { data: existingRecords, error: fetchError } = await supabase
      .from("rate_limits")
      .select("id, count, window_start")
      .eq("user_id", userId)
      .eq("limit_type", type)
      .gte("window_start", windowStart.toISOString())
      .order("window_start", { ascending: false })
      .limit(1);

    if (fetchError) {
      console.error("Rate limit check failed:", fetchError);
      // Capture to Sentry and fall back to in-memory
      Sentry.captureException(fetchError, {
        tags: {
          component: 'rate_limiter',
          failure_mode: 'database_unavailable',
          rate_limit_type: type,
        },
        contexts: {
          infrastructure: {
            fallback_active: true,
            service: 'supabase',
            user_id: userId,
          }
        }
      });
      return checkInMemoryRateLimit(type, userId);
    }

    const existing = existingRecords?.[0] as { id: string; count: number; window_start: string } | undefined;

    if (existing) {
      // Check if over limit
      if (existing.count >= config.maxRequests) {
        const windowEnd = new Date(new Date(existing.window_start).getTime() + config.windowMs);
        const retryAfter = Math.ceil((windowEnd.getTime() - Date.now()) / 1000);

        return NextResponse.json(
          {
            error: "Too many requests. Please try again later.",
            retryAfter: Math.max(retryAfter, 1),
          },
          {
            status: 429,
            headers: {
              "X-RateLimit-Limit": config.maxRequests.toString(),
              "X-RateLimit-Remaining": "0",
              "Retry-After": Math.max(retryAfter, 1).toString(),
            },
          }
        );
      }

      // Increment count
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: updateError } = await (supabase as any)
        .from("rate_limits")
        .update({
          count: existing.count + 1,
          updated_at: new Date().toISOString()
        })
        .eq("id", existing.id);

      if (updateError) {
        console.error("Rate limit update failed:", updateError);
        // Capture to Sentry and fall back to in-memory
        Sentry.captureException(updateError, {
          tags: {
            component: 'rate_limiter',
            failure_mode: 'database_unavailable',
            rate_limit_type: type,
          },
          contexts: {
            infrastructure: {
              fallback_active: true,
              service: 'supabase',
              user_id: userId,
            }
          }
        });
        return checkInMemoryRateLimit(type, userId);
      }
    } else {
      // Create new window
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: insertError } = await (supabase as any).from("rate_limits").insert({
        user_id: userId,
        limit_type: type,
        count: 1,
        window_start: new Date().toISOString(),
      });

      if (insertError) {
        console.error("Rate limit insert failed:", insertError);
        // Capture to Sentry and fall back to in-memory
        Sentry.captureException(insertError, {
          tags: {
            component: 'rate_limiter',
            failure_mode: 'database_unavailable',
            rate_limit_type: type,
          },
          contexts: {
            infrastructure: {
              fallback_active: true,
              service: 'supabase',
              user_id: userId,
            }
          }
        });
        return checkInMemoryRateLimit(type, userId);
      }
    }

    return null; // Allowed
  } catch (error) {
    console.error("Rate limit error:", error);
    // Capture to Sentry and fall back to in-memory
    Sentry.captureException(error, {
      tags: {
        component: 'rate_limiter',
        failure_mode: 'database_unavailable',
        rate_limit_type: type,
      },
      contexts: {
        infrastructure: {
          fallback_active: true,
          service: 'supabase',
          user_id: userId,
        }
      }
    });
    return checkInMemoryRateLimit(type, userId);
  }
}

/**
 * In-memory rate limit fallback (stricter limits)
 * Used when Supabase is unavailable to fail-closed
 */
async function checkInMemoryRateLimit(
  type: RateLimitType,
  userId: string
): Promise<NextResponse | null> {
  const limiter = inMemoryLimiters[type];
  const config = rateLimitConfigs[type];

  try {
    await limiter.consume(userId);
    return null; // Allowed
  } catch (rejRes) {
    // Rate limited
    const retryAfter = Math.ceil((rejRes as { msBeforeNext?: number }).msBeforeNext || 0 / 1000) || 1;

    return NextResponse.json(
      {
        error: "Too many requests. Please try again later.",
        retryAfter,
      },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": limiter.points.toString(),
          "X-RateLimit-Remaining": "0",
          "Retry-After": retryAfter.toString(),
          "X-RateLimit-Fallback": "true", // Indicate fallback mode
        },
      }
    );
  }
}

/**
 * Get rate limit headers for successful requests
 */
export function getRateLimitHeaders(
  type: RateLimitType,
  remaining: number
): Record<string, string> {
  const config = rateLimitConfigs[type];
  return {
    "X-RateLimit-Limit": config.maxRequests.toString(),
    "X-RateLimit-Remaining": remaining.toString(),
  };
}
