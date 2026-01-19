/**
 * Simple in-memory rate limiter for AI API requests
 * In production, use Redis or a dedicated rate limiting service
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store (use Redis in production)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean every minute

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Check if request is within rate limit
 */
export function checkRateLimit(
  userId: string,
  config: RateLimitConfig = { maxRequests: 30, windowMs: 60000 } // 30 requests per minute
): RateLimitResult {
  const now = Date.now();
  const key = `rate:${userId}`;

  let entry = rateLimitStore.get(key);

  // If no entry or window expired, create new entry
  if (!entry || entry.resetAt < now) {
    entry = {
      count: 1,
      resetAt: now + config.windowMs,
    };
    rateLimitStore.set(key, entry);

    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: entry.resetAt,
    };
  }

  // Increment count
  entry.count++;

  const allowed = entry.count <= config.maxRequests;
  const remaining = Math.max(0, config.maxRequests - entry.count);

  return {
    allowed,
    remaining,
    resetAt: entry.resetAt,
  };
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

/**
 * Daily query limit for free tier users
 */
const dailyQueryStore = new Map<string, { count: number; resetAt: number }>();

export interface DailyLimitConfig {
  freeLimit: number;
  proLimit: number;
}

export function checkDailyLimit(
  userId: string,
  isPro: boolean,
  config: DailyLimitConfig = { freeLimit: 50, proLimit: 500 }
): { allowed: boolean; remaining: number; limit: number } {
  const now = Date.now();
  const key = `daily:${userId}`;
  const limit = isPro ? config.proLimit : config.freeLimit;

  // Calculate midnight reset time
  const tomorrow = new Date();
  tomorrow.setHours(24, 0, 0, 0);
  const resetAt = tomorrow.getTime();

  let entry = dailyQueryStore.get(key);

  if (!entry || entry.resetAt < now) {
    entry = { count: 1, resetAt };
    dailyQueryStore.set(key, entry);
    return { allowed: true, remaining: limit - 1, limit };
  }

  entry.count++;
  const allowed = entry.count <= limit;
  const remaining = Math.max(0, limit - entry.count);

  return { allowed, remaining, limit };
}
