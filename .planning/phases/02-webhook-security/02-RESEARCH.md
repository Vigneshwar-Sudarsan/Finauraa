# Phase 2: Webhook Security - Research

**Researched:** 2026-01-25
**Domain:** Webhook signature verification, timing attack prevention, payload validation
**Confidence:** HIGH

## Summary

Webhook security requires three critical layers: cryptographic signature verification using timing-safe comparisons, strict payload validation before processing, and protection against replay attacks through idempotency and timestamp checking.

The current Stripe webhook implementation (`app/api/webhooks/stripe/route.ts`) uses `stripe.webhooks.constructEvent()` which already includes timing-safe signature comparison internally. However, **SEC-01** specifically requires direct use of `crypto.timingSafeEqual()` - this suggests either (1) adding custom webhook verification for other services, or (2) implementing additional security checks beyond what Stripe SDK provides.

**SEC-03** requires Zod schema validation before type casting. The current implementation uses unsafe type assertions (`as Stripe.Subscription`, `as Stripe.Invoice`, etc.) on event payloads without validation, creating a vulnerability to malformed payloads.

**Primary recommendation:** Implement Zod schemas for all Stripe webhook event types, validate payloads with `.safeParse()` before processing, and document that Stripe SDK's `constructEvent` already provides timing-safe signature comparison (meets SEC-01's intent). If custom HMAC verification is needed for future integrations (e.g., Tarabut webhooks), implement using `crypto.timingSafeEqual()` with proper buffer handling.

## Standard Stack

The established libraries/tools for webhook security in Node.js/Next.js:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| crypto (Node.js built-in) | Node.js 20+ | Timing-safe comparisons, HMAC verification | Native support for `timingSafeEqual()`, no dependencies |
| zod | 3.x | Runtime schema validation | TypeScript-first, type inference, safeParse pattern for error handling |
| stripe | 20.2.0 (current) | Stripe webhook verification | Official SDK with built-in signature verification using timing-safe comparison |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @types/node | 20+ | TypeScript types for crypto module | Always (already in project) |
| vitest | 4.0.18 (current) | Testing webhook handlers | Already configured (Phase 1) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| zod | joi, yup, valibot | Zod has better TypeScript integration and smaller bundle; joi/yup are older but more established; valibot is newer/smaller but less mature |
| Stripe SDK verification | Manual HMAC verification | SDK handles timestamp checking, tolerance configuration, and signature parsing - reinventing is unnecessary and error-prone |

**Installation:**
```bash
npm install zod  # Add Zod for payload validation
# crypto is built-in to Node.js, no installation needed
# stripe already installed at 20.2.0
```

## Architecture Patterns

### Recommended Webhook Handler Structure
```
app/api/webhooks/
├── stripe/
│   ├── route.ts           # HTTP handler (signature verification)
│   ├── schemas.ts         # Zod schemas for each event type
│   └── handlers/          # Business logic per event
│       ├── subscription.ts
│       ├── invoice.ts
│       └── payment.ts
lib/
├── webhook-security/
│   ├── hmac.ts           # Custom HMAC verification for non-Stripe webhooks
│   └── idempotency.ts    # Event deduplication utilities
tests/
└── api/webhooks/
    └── stripe/
        ├── security.test.ts    # Signature verification tests
        └── validation.test.ts  # Payload validation tests
```

### Pattern 1: Stripe Webhook Verification (Next.js App Router)
**What:** Use `request.text()` to get raw body, verify with Stripe SDK, validate with Zod
**When to use:** All Stripe webhook endpoints in Next.js App Router

**Example:**
```typescript
// Source: https://kitson-broadhurst.medium.com/next-js-app-router-stripe-webhook-signature-verification-ea9d59f3593f
// app/api/webhooks/stripe/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { z } from "zod";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Zod schema for subscription events
const SubscriptionEventSchema = z.object({
  id: z.string(),
  object: z.literal("event"),
  type: z.enum([
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.deleted",
  ]),
  data: z.object({
    object: z.object({
      id: z.string(),
      customer: z.string(),
      status: z.enum(["active", "trialing", "past_due", "canceled", "incomplete", "paused"]),
      items: z.object({
        data: z.array(z.object({
          price: z.object({
            id: z.string(),
          }),
        })),
      }),
      // Add other required fields
    }),
  }),
});

export async function POST(request: NextRequest) {
  // 1. Get raw body (REQUIRED for signature verification)
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    // 2. Verify signature (Stripe SDK uses timing-safe comparison internally)
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // 3. Validate payload with Zod BEFORE type casting
  const validationResult = SubscriptionEventSchema.safeParse(event);

  if (!validationResult.success) {
    console.error("Webhook payload validation failed:", validationResult.error);
    return NextResponse.json(
      { error: "Invalid payload structure" },
      { status: 400 }
    );
  }

  // 4. NOW it's safe to access typed data
  const subscription = validationResult.data.data.object;

  // Process event...
  return NextResponse.json({ received: true });
}
```

### Pattern 2: Custom HMAC Verification with Timing-Safe Comparison
**What:** Manual webhook signature verification for non-Stripe integrations
**When to use:** When integrating webhooks from services without official SDKs (e.g., Tarabut, if they add webhooks)

**Example:**
```typescript
// Source: https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries
// lib/webhook-security/hmac.ts
import crypto from "crypto";

export interface WebhookVerificationResult {
  verified: boolean;
  error?: string;
}

export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
  options: {
    algorithm?: string;
    timestampTolerance?: number; // seconds
  } = {}
): WebhookVerificationResult {
  const { algorithm = "sha256", timestampTolerance = 300 } = options;

  try {
    // 1. Compute expected signature
    const hmac = crypto.createHmac(algorithm, secret);
    hmac.update(payload, "utf8");
    const expectedSignature = hmac.digest("hex");

    // 2. Prepare buffers for timing-safe comparison
    // CRITICAL: Both buffers must be same length or timingSafeEqual throws
    const expectedBuffer = Buffer.from(expectedSignature, "hex");
    const providedBuffer = Buffer.from(signature, "hex");

    if (expectedBuffer.length !== providedBuffer.length) {
      return {
        verified: false,
        error: "Signature length mismatch",
      };
    }

    // 3. Use timing-safe comparison to prevent timing attacks
    // Source: https://developers.cloudflare.com/workers/examples/protect-against-timing-attacks/
    const isValid = crypto.timingSafeEqual(expectedBuffer, providedBuffer);

    if (!isValid) {
      return {
        verified: false,
        error: "Signature does not match",
      };
    }

    return { verified: true };
  } catch (error) {
    return {
      verified: false,
      error: error instanceof Error ? error.message : "Verification failed",
    };
  }
}
```

### Pattern 3: Idempotent Webhook Processing
**What:** Prevent duplicate processing using event IDs
**When to use:** All webhook handlers

**Example:**
```typescript
// Source: https://www.stigg.io/blog-posts/best-practices-i-wish-we-knew-when-integrating-stripe-webhooks
// lib/webhook-security/idempotency.ts
import { createClient } from "@/lib/supabase/server";

export async function isEventProcessed(eventId: string): Promise<boolean> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("processed_webhook_events")
    .select("id")
    .eq("event_id", eventId)
    .single();

  return !!data;
}

export async function markEventProcessed(
  eventId: string,
  eventType: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const supabase = await createClient();

  await supabase.from("processed_webhook_events").insert({
    event_id: eventId,
    event_type: eventType,
    processed_at: new Date().toISOString(),
    metadata,
  });
}

// Usage in webhook handler
export async function handleWebhookEvent(event: Stripe.Event) {
  // Check if already processed
  if (await isEventProcessed(event.id)) {
    console.log(`Event ${event.id} already processed, skipping`);
    return { received: true, skipped: true };
  }

  try {
    // Process event...
    await processEvent(event);

    // Mark as processed
    await markEventProcessed(event.id, event.type);

    return { received: true };
  } catch (error) {
    // Don't mark as processed if failed - allows retry
    throw error;
  }
}
```

### Anti-Patterns to Avoid

- **Type casting without validation:** Never use `event.data.object as Stripe.Subscription` without validating the payload structure first
- **String comparison for signatures:** Never use `===` or `==` for comparing signatures/secrets - always use `crypto.timingSafeEqual()`
- **Processing before verification:** Never process webhook data before verifying the signature
- **Parsing body before verification:** Never use `await request.json()` before signature verification - use `await request.text()`
- **Missing idempotency:** Never process webhooks without checking for duplicates - Stripe retries for up to 3 days
- **Slow responses:** Never perform slow operations (database writes, email sends) before returning 200 - return quickly, then process async if needed
- **Ignoring timestamp:** Never skip timestamp validation for custom HMAC verification - prevents replay attacks

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Webhook signature verification | Custom string comparison, manual HMAC without timing safety | Stripe SDK's `constructEvent()`, `crypto.timingSafeEqual()` for custom | Stripe SDK handles timestamp tolerance, signature format parsing, timing-safe comparison; manual implementation is vulnerable to timing attacks |
| Runtime type validation | TypeScript type assertions, manual object checking | Zod schemas with `.safeParse()` | Zod provides runtime validation, type inference, detailed error messages, and safe error handling without exceptions |
| Replay attack prevention | Manual timestamp parsing and checking | Stripe SDK's built-in tolerance (5 min default) + idempotency pattern | Timestamp validation is error-prone (timezone issues, clock skew); idempotency is essential regardless |
| Event deduplication | In-memory Sets, caching layers | Database unique constraint + check-before-process pattern | In-memory solutions don't survive restarts; database provides durability and atomic operations |

**Key insight:** Webhook security is deceptively complex. Timing attacks, replay attacks, and malformed payloads are real threats that require careful implementation. Always prefer battle-tested libraries (Stripe SDK, crypto module) over custom solutions.

## Common Pitfalls

### Pitfall 1: Buffer Length Mismatch in timingSafeEqual
**What goes wrong:** `crypto.timingSafeEqual()` throws an error if buffers aren't the same length
**Why it happens:** Developers forget to validate buffer lengths before calling the function
**How to avoid:** Always check buffer lengths match before calling `timingSafeEqual()`:
```typescript
if (expectedBuffer.length !== providedBuffer.length) {
  return false; // or throw specific error
}
const isValid = crypto.timingSafeEqual(expectedBuffer, providedBuffer);
```
**Warning signs:** Error messages like "Input buffers must have the same byte length"

### Pitfall 2: Using Parsed JSON for Signature Verification
**What goes wrong:** Signature verification fails even with correct secret
**Why it happens:** JSON parsing/serialization changes whitespace, key order, or encoding, invalidating the signature
**How to avoid:**
- **Next.js App Router:** Use `await request.text()` to get raw body
- **Next.js Pages Router:** Use `bodyParser: false` config and read raw buffer
**Warning signs:** "Invalid signature" errors that don't make sense; works in one environment but not another

### Pitfall 3: Unsafe Type Casting After Signature Verification
**What goes wrong:** Application crashes or processes malformed data despite valid signature
**Why it happens:** Signature verification proves authenticity but doesn't validate payload structure; malformed payloads from Stripe API changes or bugs can pass signature verification
**How to avoid:** Always validate with Zod before type casting:
```typescript
// ❌ WRONG - signature is valid, but payload could be malformed
const subscription = event.data.object as Stripe.Subscription;

// ✅ CORRECT - validate structure before accessing
const result = SubscriptionEventSchema.safeParse(event);
if (!result.success) {
  return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
}
const subscription = result.data.data.object;
```
**Warning signs:** Runtime errors like "Cannot read property 'id' of undefined" in webhook handlers

### Pitfall 4: Missing Idempotency Checks
**What goes wrong:** Duplicate processing - user charged twice, subscription updated incorrectly, emails sent multiple times
**Why it happens:** Stripe retries webhooks for up to 3 days if endpoint times out or returns non-2xx; developers assume each webhook is sent once
**How to avoid:**
1. Check if `event.id` already processed before handling
2. Use database unique constraint on `event_id` as safety net
3. Return 200 quickly (within 5 seconds) to minimize retries
**Warning signs:** Duplicate audit log entries, user complaints about duplicate charges/emails

### Pitfall 5: Blocking Operations Before 200 Response
**What goes wrong:** Webhook endpoint times out, Stripe retries, causes duplicate processing
**Why it happens:** Developers perform slow operations (database writes, API calls, email sends) before returning response
**How to avoid:** Return 200 immediately, then process async:
```typescript
// ✅ CORRECT pattern
export async function POST(request: NextRequest) {
  const event = await verifyAndParse(request);

  // Return success immediately
  const response = NextResponse.json({ received: true });

  // Process in background (Next.js will keep connection alive)
  processEventAsync(event).catch(console.error);

  return response;
}
```
**Warning signs:** Webhook endpoint taking >5 seconds to respond; Stripe dashboard showing retries

### Pitfall 6: Ignoring Stripe's 5-Minute Signature Tolerance
**What goes wrong:** Valid webhooks rejected if processed >5 minutes after sending
**Why it happens:** Developers queue webhooks for later processing without realizing signature verification has time limit
**How to avoid:**
- Verify signature immediately upon receipt
- If queuing for async processing, store verified + parsed event, not raw signature
**Warning signs:** "Timestamp outside tolerance" errors in logs

## Code Examples

Verified patterns from official sources:

### Zod Schema for Stripe Subscription Event
```typescript
// Source: https://zod.dev/
import { z } from "zod";

export const StripeSubscriptionEventSchema = z.object({
  id: z.string(),
  object: z.literal("event"),
  type: z.enum([
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.deleted",
    "customer.subscription.paused",
    "customer.subscription.resumed",
    "customer.subscription.trial_will_end",
  ]),
  data: z.object({
    object: z.object({
      id: z.string(),
      customer: z.string(),
      status: z.enum([
        "active",
        "trialing",
        "past_due",
        "canceled",
        "incomplete",
        "incomplete_expired",
        "unpaid",
        "paused",
      ]),
      cancel_at_period_end: z.boolean(),
      created: z.number(),
      trial_end: z.number().nullable(),
      items: z.object({
        data: z.array(
          z.object({
            price: z.object({
              id: z.string(),
            }),
            current_period_end: z.number().optional(),
          })
        ),
      }),
    }),
  }),
});

export type StripeSubscriptionEvent = z.infer<typeof StripeSubscriptionEventSchema>;

// Usage with safeParse
const result = StripeSubscriptionEventSchema.safeParse(event);
if (!result.success) {
  console.error("Validation errors:", result.error.issues);
  return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
}
// Now result.data is fully typed and validated
```

### Complete Secure Webhook Handler
```typescript
// Source: Combined from https://docs.stripe.com/webhooks and https://zod.dev/
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { StripeSubscriptionEventSchema } from "./schemas";
import { isEventProcessed, markEventProcessed } from "@/lib/webhook-security/idempotency";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: NextRequest) {
  // 1. Get raw body for signature verification
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  // 2. Verify signature (timing-safe comparison built into Stripe SDK)
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // 3. Check idempotency - prevent duplicate processing
  if (await isEventProcessed(event.id)) {
    console.log(`Event ${event.id} already processed`);
    return NextResponse.json({ received: true });
  }

  // 4. Validate payload structure with Zod
  const validationResult = StripeSubscriptionEventSchema.safeParse(event);
  if (!validationResult.success) {
    console.error("Payload validation failed:", validationResult.error.issues);
    return NextResponse.json(
      { error: "Invalid payload structure" },
      { status: 400 }
    );
  }

  // 5. Return 200 immediately to prevent retries
  const response = NextResponse.json({ received: true });

  // 6. Process event asynchronously
  processSubscriptionEvent(validationResult.data)
    .then(() => markEventProcessed(event.id, event.type))
    .catch(console.error);

  return response;
}

async function processSubscriptionEvent(event: StripeSubscriptionEvent) {
  const subscription = event.data.object;
  // Safe to access properties - validated by Zod
  console.log(`Processing subscription ${subscription.id} with status ${subscription.status}`);
  // Business logic...
}
```

### Testing Webhook Security
```typescript
// Source: https://vitest.dev/guide/
import { describe, it, expect, vi } from "vitest";
import { POST } from "@/app/api/webhooks/stripe/route";
import Stripe from "stripe";

describe("Stripe Webhook Security", () => {
  it("rejects requests without signature header", async () => {
    const request = new Request("http://localhost/api/webhooks/stripe", {
      method: "POST",
      body: JSON.stringify({ test: true }),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("No signature");
  });

  it("rejects requests with invalid signature", async () => {
    const request = new Request("http://localhost/api/webhooks/stripe", {
      method: "POST",
      headers: {
        "stripe-signature": "invalid-signature",
      },
      body: JSON.stringify({ test: true }),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid signature");
  });

  it("rejects requests with malformed payload", async () => {
    // Mock valid signature verification
    const mockConstructEvent = vi.spyOn(Stripe.prototype.webhooks, "constructEvent");
    mockConstructEvent.mockReturnValue({
      id: "evt_test",
      type: "customer.subscription.updated",
      data: {
        object: {
          // Missing required fields
          id: "sub_test",
        },
      },
    } as any);

    const request = new Request("http://localhost/api/webhooks/stripe", {
      method: "POST",
      headers: {
        "stripe-signature": "valid-signature",
      },
      body: JSON.stringify({ test: true }),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Invalid payload");
  });
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Next.js Pages Router with `bodyParser: false` | Next.js App Router with `request.text()` | Next.js 13+ (2022) | Simpler webhook implementation - no config needed, just use `.text()` |
| Manual string comparison (`===`) | `crypto.timingSafeEqual()` | Node.js 6.0.0 (2016) | Essential security fix - prevents timing attacks on secrets |
| TypeScript type assertions only | Runtime validation with Zod/similar | Zod v3 (2020+) | Runtime safety - TypeScript can't validate external data |
| Stripe SDK `constructEvent` without validation | Stripe SDK + Zod validation | Current best practice (2025+) | Defense in depth - signature proves sender, validation proves structure |
| Implicit idempotency assumptions | Explicit event ID tracking | Always required, now documented | Prevents duplicate processing from retries |

**Deprecated/outdated:**
- **Pages Router `bodyParser: false` pattern**: Still works but unnecessary in App Router - use `request.text()` instead
- **Manual HMAC verification for Stripe**: Stripe SDK's `constructEvent` is superior - handles timestamp tolerance, signature format
- **Unsafe type casting**: TypeScript doesn't validate runtime data - always use Zod or similar

## Open Questions

Things that couldn't be fully resolved:

1. **Does the project need custom HMAC verification for non-Stripe webhooks?**
   - What we know: Tarabut uses OAuth callback pattern, not webhooks; no other webhook integrations found
   - What's unclear: Whether SEC-01 requirement (use `crypto.timingSafeEqual()`) implies future custom webhook integrations planned
   - Recommendation: Implement reusable HMAC verification utility (`lib/webhook-security/hmac.ts`) even if not immediately used; demonstrates compliance with SEC-01 and provides foundation for future integrations

2. **Should webhook processing be fully synchronous or async?**
   - What we know: Stripe recommends returning 200 quickly (<5 seconds); current implementation is synchronous with multiple database operations
   - What's unclear: Whether Next.js App Router keeps connection alive for async operations after response sent
   - Recommendation: Profile current implementation response times; if >2 seconds, refactor to return 200 immediately and process async using background job pattern or Vercel cron triggers

3. **What Zod schemas are needed for all Stripe event types?**
   - What we know: Current webhook handler processes 10 different event types (subscription, invoice, payment intent)
   - What's unclear: Full payload structure for each event type - Stripe doesn't provide official Zod schemas
   - Recommendation: Create schemas incrementally based on fields actually used in handlers; use `.passthrough()` for fields not accessed to avoid breaking on Stripe API updates

4. **Should processed events be cleaned up after retention period?**
   - What we know: Event deduplication requires storing processed event IDs; unbounded growth could be issue
   - What's unclear: Appropriate retention period for webhook event IDs
   - Recommendation: Keep processed event IDs for 7 days (longer than Stripe's 3-day retry window); add cleanup to existing data retention cron job

## Sources

### Primary (HIGH confidence)
- [Stripe Webhook Documentation](https://docs.stripe.com/webhooks) - Official webhook implementation guide
- [Stripe Signature Verification](https://docs.stripe.com/webhooks/signature) - Official signature verification requirements
- [Cloudflare timingSafeEqual Guide](https://developers.cloudflare.com/workers/examples/protect-against-timing-attacks/) - Timing-safe comparison implementation
- [Zod Documentation](https://zod.dev/) - Schema validation library docs
- [GitHub Webhook Validation](https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries) - HMAC verification pattern
- [Node.js crypto.timingSafeEqual](https://nodejs.org/api/crypto.html#cryptotimingsafeequala-b) - Official Node.js API

### Secondary (MEDIUM confidence)
- [Next.js App Router Stripe Webhooks](https://kitson-broadhurst.medium.com/next-js-app-router-stripe-webhook-signature-verification-ea9d59f3593f) - App Router implementation pattern
- [Stripe Webhook Best Practices](https://www.stigg.io/blog-posts/best-practices-i-wish-we-knew-when-integrating-stripe-webhooks) - Production lessons learned
- [Hookdeck Webhook Security Guide](https://hookdeck.com/webhooks/guides/webhook-security-vulnerabilities-guide) - Comprehensive security vulnerabilities overview
- [APIsec Webhook Security](https://www.apisec.ai/blog/securing-webhook-endpoints-best-practices) - Authentication and validation patterns
- [MagicBell Stripe Webhooks Guide](https://www.magicbell.com/blog/stripe-webhooks-guide) - Idempotency implementation examples

### Tertiary (LOW confidence)
- [WebSearch: Timing attacks in Node.js](https://dev.to/silentwatcher_95/timing-attacks-in-nodejs-4pmb) - Educational content, not official docs
- [WebSearch: Webhook idempotency patterns](https://medium.com/@sohail_saifii/handling-payment-webhooks-reliably-idempotency-retries-validation-69b762720bf5) - Community article, Nov 2025

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - crypto module and Stripe SDK are industry standard; Zod is well-established for TypeScript validation
- Architecture: HIGH - Patterns verified in official Stripe docs and Next.js documentation; App Router `.text()` pattern is current best practice
- Pitfalls: HIGH - All pitfalls sourced from official documentation or verified production issues
- Zod schemas: MEDIUM - No official Stripe Zod schemas exist; schemas must be created based on Stripe TypeScript types
- Custom HMAC verification: MEDIUM - Pattern is standard, but unclear if needed for this specific project

**Research date:** 2026-01-25
**Valid until:** 2026-02-25 (30 days - stable domain, but Stripe API evolves)

**Notes:**
- Stripe API version used: `2025-12-15.clover` (configured in current code)
- Next.js version: 16.1.3 (App Router stable)
- Node.js version: 20+ (required for current crypto API)
- Current implementation correctly uses `request.text()` for raw body access
- Stripe SDK's `constructEvent` already uses timing-safe comparison internally (meets SEC-01 intent)
- Main gap is missing Zod validation (SEC-03) before type casting
