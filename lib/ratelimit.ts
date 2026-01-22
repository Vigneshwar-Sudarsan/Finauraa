import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

/**
 * Check rate limit using Supabase
 * Returns null if allowed, or a NextResponse if rate limited
 */
export async function checkRateLimit(
  type: RateLimitType,
  userId: string
): Promise<NextResponse | null> {
  const supabase = getSupabaseAdmin();

  // If Supabase not configured, allow request (fail-open)
  if (!supabase) {
    return null;
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
      return null; // Fail-open
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
      await (supabase as any)
        .from("rate_limits")
        .update({
          count: existing.count + 1,
          updated_at: new Date().toISOString()
        })
        .eq("id", existing.id);
    } else {
      // Create new window
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from("rate_limits").insert({
        user_id: userId,
        limit_type: type,
        count: 1,
        window_start: new Date().toISOString(),
      });
    }

    return null; // Allowed
  } catch (error) {
    console.error("Rate limit error:", error);
    return null; // Fail-open
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
