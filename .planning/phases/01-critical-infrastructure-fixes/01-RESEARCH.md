# Phase 1: Critical Infrastructure Fixes - Research

**Researched:** 2026-01-25
**Domain:** Infrastructure reliability, fail-safe patterns, error handling
**Confidence:** HIGH

## Summary

This research investigates how to implement fail-safe infrastructure for database-dependent rate limiting and consistent error handling in middleware. The focus is on ensuring the application degrades gracefully when core dependencies (Supabase) fail, rather than silently allowing unlimited access or returning inconsistent errors.

**Current State Analysis:**
- Rate limiter fails open (allows all requests) when Supabase unavailable
- Consent middleware returns different error structures for similar edge cases
- No testing infrastructure exists to verify fixes
- No monitoring/alerting for infrastructure failures

**Standard Approach:**
The industry-standard pattern for critical infrastructure is fail-closed with in-memory fallback. When the primary store (database) fails, the system should either block requests (fail-closed) or fall back to a secondary mechanism (in-memory rate limiting) with reduced capacity. For error handling, consistent error response structures with typed error codes enable frontend applications to handle all cases uniformly.

**Primary recommendation:** Use `rate-limiter-flexible` with insurance strategy for database fallback, implement Result pattern with custom error types for middleware consistency, add Vitest with mocked Supabase client for testing, and configure Sentry alerts for infrastructure failures.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| rate-limiter-flexible | 5.0.3+ | Rate limiting with fallback support | Most mature Node.js rate limiting library, supports insurance strategy for database failures, works with Redis, MongoDB, Postgres, and in-memory |
| Vitest | 2.x | Testing framework | Official Next.js recommendation for testing, 10-20x faster than Jest, native ESM support, works with Next.js 16 |
| @testing-library/react | 16.x | Component testing utilities | Industry standard for testing React components and hooks |
| MSW (Mock Service Worker) | 2.x | API mocking for tests | Standard for mocking HTTP requests in tests, works with Vitest |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| opossum | 8.1.3+ | Circuit breaker pattern | If implementing circuit breaker for Supabase calls (optional, can defer) |
| neverthrow | 7.x | Result type implementation | If adopting functional error handling (optional, can use custom types) |
| @sentry/nextjs | 10.35.0+ | Error tracking & alerting | Already installed in project, configure for infrastructure alerts |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| rate-limiter-flexible | Custom implementation | Custom code lacks battle-tested fallback logic, harder to maintain |
| Vitest | Jest | Jest slower (10-20x), more complex ESM setup, but more established |
| MSW | Manual mocks | MSW provides realistic network layer testing, manual mocks are fragile |
| neverthrow | Custom Result type | neverthrow adds dependency, custom type gives full control |

**Installation:**
```bash
npm install rate-limiter-flexible
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom vite-tsconfig-paths msw
```

## Architecture Patterns

### Recommended Project Structure
```
lib/
├── ratelimit.ts                  # Current rate limiter
├── ratelimit-v2.ts              # New implementation with fallback
├── consent-middleware.ts         # Update with consistent errors
└── __tests__/                   # New test directory
    ├── ratelimit.test.ts        # Rate limiter unit tests
    └── consent-middleware.test.ts

app/api/
└── __tests__/                   # API route integration tests
    └── test-utils.ts            # Shared test utilities

vitest.config.mts                # Vitest configuration
```

### Pattern 1: Rate Limiter with Insurance Fallback
**What:** Primary database-backed rate limiter with automatic in-memory fallback when database fails
**When to use:** Critical rate limiting that must never fail open
**Example:**
```typescript
// Source: https://github.com/animir/node-rate-limiter-flexible/wiki/Insurance-Strategy
import { RateLimiterMemory, RateLimiterPostgres } from 'rate-limiter-flexible';

// In-memory fallback (per-process limits)
const memoryLimiter = new RateLimiterMemory({
  points: 10,      // Stricter limit during fallback
  duration: 60,    // 10 per minute
});

// Primary database limiter with insurance
const rateLimiter = new RateLimiterPostgres({
  storeClient: supabaseClient,
  points: 60,
  duration: 60,
  insuranceLimiter: memoryLimiter,  // Automatic fallback
  tableName: 'rate_limits',
});

// Usage - automatically uses memory fallback on DB failure
try {
  await rateLimiter.consume(userId);
  // Request allowed
} catch (rejRes) {
  if (rejRes instanceof Error) {
    // Critical error - fail closed
    throw new Error('Rate limiting unavailable');
  }
  // Rate limited - return 429
  return new Response('Too many requests', { status: 429 });
}
```

### Pattern 2: Consistent Error Response Structure
**What:** Typed error codes with consistent response shape across all middleware
**When to use:** All middleware that can fail with multiple edge cases
**Example:**
```typescript
// Source: Industry pattern from https://medium.com/@finnkumar6/how-to-write-api-response-types-with-typescript-ebd3fca20844
type ConsentErrorCode =
  | 'NO_CONSENT'
  | 'CONSENT_EXPIRED'
  | 'CONSENT_REVOKED'
  | 'NO_BANKS'
  | 'CHECK_FAILED';

interface ConsentError {
  error: string;              // User-facing message
  code: ConsentErrorCode;     // Machine-readable code
  requiresConsent: boolean;   // Action required
  details?: unknown;          // Optional debug info
}

// Middleware always returns same shape
export async function checkConsent(userId: string): Promise<
  | { allowed: true; consentId: string }
  | { allowed: false; error: ConsentError }
> {
  // All edge cases return consistent error structure
  if (noBanks) {
    return {
      allowed: false,
      error: {
        error: 'No bank connections found',
        code: 'NO_BANKS',
        requiresConsent: false,
      }
    };
  }
  // ... other cases
}
```

### Pattern 3: Testing API Routes with Mocked Supabase
**What:** Test API routes by mocking Supabase client methods to simulate database failures
**When to use:** Testing all API routes that depend on Supabase
**Example:**
```typescript
// Source: https://nextjs.org/docs/app/guides/testing/vitest
import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/finance/accounts/route';

describe('GET /api/finance/accounts', () => {
  it('returns 403 when consent expired', async () => {
    // Mock Supabase client
    const mockSupabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() =>
              Promise.resolve({
                data: null,
                error: { code: 'PGRST116' }
              })
            )
          }))
        }))
      }))
    };

    const req = new NextRequest('http://localhost:3000/api/finance/accounts');
    const response = await GET(req);
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json.code).toBe('CONSENT_EXPIRED');
  });
});
```

### Pattern 4: Sentry Infrastructure Alerts
**What:** Configure Sentry to alert on specific infrastructure failure patterns
**When to use:** Production monitoring for rate limiter and middleware failures
**Example:**
```typescript
// Source: https://docs.sentry.io/platforms/javascript/guides/nextjs/
import * as Sentry from '@sentry/nextjs';

// In rate limiter
try {
  await supabase.from('rate_limits').select();
} catch (error) {
  // Tag infrastructure failures for alerting
  Sentry.captureException(error, {
    tags: {
      component: 'rate_limiter',
      failure_mode: 'database_unavailable',
      severity: 'critical'
    },
    contexts: {
      infrastructure: {
        fallback_active: true,
        service: 'supabase'
      }
    }
  });
  // Continue with fallback
}
```

### Anti-Patterns to Avoid
- **Silent fail-open:** Never silently allow requests when rate limiter fails - either fail closed or use fallback with logging
- **Inconsistent error codes:** Don't return different error structures for similar cases (403 vs 200 with empty data)
- **Testing production services:** Don't test against real Supabase in CI/CD - always mock
- **Ignoring infrastructure errors:** Don't swallow database errors without alerting/logging

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Rate limiting with fallback | Custom database rate limiter with try/catch | rate-limiter-flexible with insurance | Edge cases: atomic increments, race conditions, window sliding, cleanup, multi-store support |
| In-memory rate limiting | Simple object with timestamps | RateLimiterMemory from rate-limiter-flexible | Edge cases: memory leaks, precision timing, multi-process coordination |
| Circuit breaker | Custom failure counter | opossum library | Edge cases: half-open state transitions, timeout management, event emission |
| Supabase mocking | Custom mock objects | MSW with request handlers | Edge cases: chained queries, error scenarios, type safety |

**Key insight:** Reliability patterns have subtle failure modes that only appear under load or specific timing conditions. Battle-tested libraries have solved these edge cases through years of production use.

## Common Pitfalls

### Pitfall 1: In-Memory Fallback Limits Not Per-Process
**What goes wrong:** Insurance limiter (in-memory) doesn't share state across Node.js processes, so each process gets full limit
**Why it happens:** Memory isn't shared between processes - each worker has independent state
**How to avoid:**
- Set insurance limiter to STRICTER limits (e.g., 10/min instead of 60/min)
- Document that during database outage, effective limit is `limit * num_processes`
- Monitor fallback usage and alert if sustained
**Warning signs:** Rate limit enforcement weaker during database issues, users reporting ability to bypass limits

### Pitfall 2: Fail-Closed Blocks ALL Requests
**What goes wrong:** If fail-closed is too aggressive, legitimate users can't access app during database blip
**Why it happens:** Database has momentary connectivity issue, all requests denied
**How to avoid:**
- Use insurance strategy (fail to in-memory, not fail-closed)
- Only fail-closed for non-recoverable errors
- Implement exponential backoff before giving up on database
**Warning signs:** Spike in 503 errors correlated with database latency spikes

### Pitfall 3: Testing Against Real Supabase in CI
**What goes wrong:** Tests fail randomly due to network issues, tests pollute production/staging data
**Why it happens:** Using `createClient()` with real credentials in tests
**How to avoid:**
- Always mock Supabase client in unit/integration tests
- Use MSW to intercept network requests
- Test against local Supabase (docker-compose) only for E2E tests
**Warning signs:** Flaky tests, unexpected data in database, tests requiring VPN/network access

### Pitfall 4: Inconsistent Error Codes Between Similar Cases
**What goes wrong:** Frontend has to special-case multiple error formats for same logical error
**Why it happens:** Different code paths return different error structures
**How to avoid:**
- Define single error response type with union of error codes
- Use factory function to create all error responses
- Test that all code paths return same shape
**Warning signs:** Frontend has many conditional checks for error handling, duplicate error handling logic

### Pitfall 5: No Alerting for Infrastructure Fallback
**What goes wrong:** Database fails, system runs on fallback for days, nobody notices until it's worse
**Why it happens:** Fallback works "well enough" that degradation isn't obvious
**How to avoid:**
- Log at ERROR level when fallback activates
- Send Sentry event tagged for infrastructure alerts
- Configure alert rules for sustained fallback usage (>5 minutes)
**Warning signs:** Database issues discovered only during manual checks, users reporting inconsistent behavior

## Code Examples

Verified patterns from official sources:

### Testing Consent Middleware Edge Cases
```typescript
// Source: Vitest documentation + project patterns
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkBankAccessConsent } from '@/lib/consent-middleware';

describe('checkBankAccessConsent', () => {
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = {
      from: vi.fn(),
    };
  });

  it('returns NO_BANKS when user has no connections', async () => {
    // Mock bank_connections count query
    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          in: vi.fn(() => Promise.resolve({ count: 0 }))
        }))
      }))
    });

    const result = await checkBankAccessConsent(mockSupabase, 'user-123');

    expect(result).toEqual({
      hasConsent: true,
      noBanksConnected: true,
    });
  });

  it('returns CONSENT_EXPIRED when consent exists but expired', async () => {
    // Mock has banks
    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          in: vi.fn(() => Promise.resolve({ count: 1 }))
        }))
      }))
    });

    // Mock expired consent
    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              gte: vi.fn(() => ({
                order: vi.fn(() => ({
                  limit: vi.fn(() => ({
                    single: vi.fn(() =>
                      Promise.resolve({
                        data: null,
                        error: { code: 'PGRST116' }
                      })
                    )
                  }))
                }))
              }))
            }))
          }))
        }))
      }))
    });

    // Mock finding expired consent
    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(() => ({
                single: vi.fn(() =>
                  Promise.resolve({
                    data: {
                      consent_status: 'expired',
                      consent_expires_at: '2024-01-01'
                    },
                    error: null
                  })
                )
              }))
            }))
          }))
        }))
      }))
    });

    const result = await checkBankAccessConsent(mockSupabase, 'user-123');

    expect(result).toEqual({
      hasConsent: false,
      error: expect.stringContaining('expired'),
      errorCode: 'CONSENT_EXPIRED',
    });
  });
});
```

### Migrating to rate-limiter-flexible
```typescript
// Source: https://github.com/animir/node-rate-limiter-flexible
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { createClient } from '@supabase/supabase-js';

// Create in-memory fallback (stricter limits)
const memoryLimiter = new RateLimiterMemory({
  points: 10,        // 10 requests during fallback
  duration: 60,      // per 60 seconds
  blockDuration: 60, // block for 60s if exceeded
});

// Primary Supabase-backed limiter
// Note: rate-limiter-flexible doesn't have built-in Supabase adapter
// We need custom implementation or stick with current approach + insurance pattern

// Alternative: Wrap current implementation with fallback
export async function checkRateLimitWithFallback(
  type: RateLimitType,
  userId: string
): Promise<NextResponse | null> {
  try {
    // Try database rate limiting
    const result = await checkRateLimit(type, userId);
    return result;
  } catch (error) {
    // Database failed - fall back to memory
    console.error('Rate limit database failed, using memory fallback', error);

    // Log to Sentry
    Sentry.captureException(error, {
      tags: { component: 'rate_limiter', fallback: 'memory' }
    });

    try {
      await memoryLimiter.consume(`${type}:${userId}`);
      return null; // Allowed
    } catch (rejRes) {
      // Rate limited in memory
      return NextResponse.json(
        { error: 'Too many requests (limited capacity)', retryAfter: 60 },
        { status: 429 }
      );
    }
  }
}
```

### Vitest Configuration for Next.js
```typescript
// Source: https://nextjs.org/docs/app/guides/testing/vitest
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [
    tsconfigPaths(), // Resolve @ path alias
    react(),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', '.next', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        '.next/',
        'vitest.config.ts',
        '**/*.d.ts',
      ],
    },
  },
})
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Jest for testing | Vitest for modern projects | 2023-2024 | 10-20x faster, native ESM, better Vite integration |
| Try-catch fail-open | Insurance/fallback pattern | Ongoing | Graceful degradation vs complete failure |
| String error messages | Typed error codes with discriminated unions | 2024-2026 | Type-safe error handling, consistent UX |
| Redis-only rate limiting | Multi-store with fallback | 2023+ | Resilience to single store failure |
| Manual Supabase mocks | MSW for API mocking | 2022+ | Realistic network-layer testing |

**Deprecated/outdated:**
- **Jest with Next.js:** Official docs now recommend Vitest for new projects (faster, simpler ESM)
- **Fail-open rate limiting:** Industry moved to fail-closed with fallback after abuse incidents
- **String-based error codes:** TypeScript discriminated unions provide type safety

## Open Questions

Things that couldn't be fully resolved:

1. **rate-limiter-flexible Supabase adapter**
   - What we know: Library supports Redis, Postgres, MongoDB, but no official Supabase adapter
   - What's unclear: Whether Postgres adapter works with Supabase PostgREST, or if custom wrapper needed
   - Recommendation: Test Postgres adapter with Supabase in prototype, fall back to wrapping current implementation with insurance pattern if incompatible

2. **Multi-process coordination during fallback**
   - What we know: In-memory fallback doesn't share state between Node.js processes
   - What's unclear: Vercel serverless function behavior - are they separate processes or shared?
   - Recommendation: Set conservative fallback limits, add monitoring to measure actual enforcement

3. **Vitest support for Next.js middleware**
   - What we know: Official Vitest docs mention async Server Components not supported, silent on middleware
   - What's unclear: Whether Edge Runtime middleware can be tested in jsdom environment
   - Recommendation: Test API route handlers (which can be tested), treat middleware as thin wrapper

4. **Consent middleware behavior alignment**
   - What we know: Current code allows requests when no banks (returns empty data) vs blocks when banks exist but no consent
   - What's unclear: Is this intentional design or should both require consent after first connection?
   - Recommendation: Clarify with stakeholder during planning, document chosen behavior

## Sources

### Primary (HIGH confidence)
- [rate-limiter-flexible GitHub](https://github.com/animir/node-rate-limiter-flexible) - Core library documentation
- [rate-limiter-flexible Insurance Strategy](https://github.com/animir/node-rate-limiter-flexible/wiki/Insurance-Strategy) - Official fallback pattern docs
- [Next.js Vitest Guide](https://nextjs.org/docs/app/guides/testing/vitest) - Official testing setup
- [Sentry Next.js Documentation](https://docs.sentry.io/platforms/javascript/guides/nextjs/) - Official monitoring setup

### Secondary (MEDIUM confidence)
- [Fortifying Node.js APIs with Rate Limiting and Circuit Breakers](https://leapcell.io/blog/fortifying-node-js-apis-with-rate-limiting-and-circuit-breakers) - Pattern overview
- [Gravitee: API Rate Limiting at Scale](https://www.gravitee.io/blog/rate-limiting-apis-scale-patterns-strategies) - Fail-open/fail-closed best practices
- [API Testing with Vitest in Next.js](https://medium.com/@sanduni.s/api-testing-with-vitest-in-next-js-a-practical-guide-to-mocking-vs-spying-5e5b37677533) - Testing patterns
- [Production-Ready Middleware in Node.js + TypeScript (2026)](https://virangaj.medium.com/comprehensive-guide-production-ready-middleware-in-node-js-typescript-2026-edition-f1c29184aacd) - Middleware patterns
- [Next.js Production Monitoring: Sentry Integration](https://eastondev.com/blog/en/posts/dev/20251220-nextjs-production-monitoring/) - Alert configuration

### Tertiary (LOW confidence - needs validation)
- [How to Build a REST API with TypeScript in 2026](https://encore.dev/articles/build-rest-api-typescript-2026) - Error response patterns
- [Testing React and Supabase with MSW](https://nygaard.dev/blog/testing-supabase-rtl-msw) - Supabase mocking approach
- [Testing: Vitest | Next.js](https://nextjs.org/docs/app/guides/testing/vitest) - Async component limitations

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official docs and mature libraries
- Architecture patterns: HIGH - Verified from library documentation and official Next.js guides
- Testing approach: MEDIUM - Vitest officially recommended but Supabase mocking patterns less documented
- Pitfalls: HIGH - Based on library documentation and known failure modes

**Research date:** 2026-01-25
**Valid until:** ~60 days (stable ecosystem, but test as library versions update)

**Key gaps for planning:**
1. Need to prototype rate-limiter-flexible with Supabase to confirm compatibility
2. Should validate in-memory fallback behavior on Vercel serverless
3. Clarify consent middleware intended behavior with stakeholder
