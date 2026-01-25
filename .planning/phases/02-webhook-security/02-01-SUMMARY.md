---
phase: 02-webhook-security
plan: 01
subsystem: security
tags: [zod, hmac, crypto, webhooks, stripe, validation, timing-safe]

# Dependency graph
requires:
  - phase: 01-critical-infrastructure-fixes
    provides: Test infrastructure with Vitest
provides:
  - Zod validation schemas for all 10 Stripe webhook event types
  - Timing-safe HMAC verification utility using crypto.timingSafeEqual()
  - Comprehensive tests for HMAC verification (25 test cases)
  - Foundation for SEC-01 (timing attack prevention) and SEC-03 (payload validation)
affects: [02-02, webhook-integration, tarabut-gateway, payment-processing]

# Tech tracking
tech-stack:
  added: [zod]
  patterns: [discriminated-union-validation, timing-safe-comparison, passthrough-schemas]

key-files:
  created:
    - app/api/webhooks/stripe/schemas.ts
    - lib/webhook-security/hmac.ts
    - tests/lib/webhook-security/hmac.test.ts
  modified:
    - package.json
    - package-lock.json

key-decisions:
  - "Use Zod discriminated unions for type-safe event routing"
  - "Validate only accessed fields with .passthrough() for forward compatibility"
  - "Demonstrate direct crypto.timingSafeEqual() usage for future non-Stripe webhooks"
  - "Handle buffer length mismatch before timingSafeEqual to prevent RangeError"

patterns-established:
  - "Zod schema pattern: validate critical fields, passthrough for flexibility"
  - "HMAC verification pattern: check buffer lengths before constant-time comparison"
  - "Test environment override: @vitest-environment node for Node.js-specific tests"

# Metrics
duration: 3min
completed: 2026-01-25
---

# Phase 02 Plan 01: Webhook Security Foundations Summary

**Zod validation schemas for 10 Stripe webhook events with timing-safe HMAC verification utility demonstrating crypto.timingSafeEqual() for SEC-01 compliance**

## Performance

- **Duration:** 3 min
- **Started:** 2026-01-25T20:33:49Z
- **Completed:** 2026-01-25T20:36:59Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Installed Zod and created runtime validation schemas for all Stripe webhook event types
- Built reusable HMAC verification utility with timing-safe comparison
- Achieved 100% test coverage for HMAC utility (25/25 tests passing)
- Established foundation for SEC-01 (timing attack prevention) and SEC-03 (payload validation)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Zod schemas for Stripe webhook events** - `972ef25` (feat)
2. **Task 2: Create timing-safe HMAC verification utility with tests** - `b8238e0` (feat)

**Plan metadata:** (to be added in final commit)

## Files Created/Modified

- `app/api/webhooks/stripe/schemas.ts` - Zod schemas for 10 Stripe webhook event types using discriminated unions
- `lib/webhook-security/hmac.ts` - Timing-safe HMAC verification with crypto.timingSafeEqual()
- `tests/lib/webhook-security/hmac.test.ts` - Comprehensive HMAC tests (valid signatures, invalid signatures, edge cases)
- `package.json` - Added Zod dependency
- `package-lock.json` - Lockfile update

## Decisions Made

1. **Zod discriminated unions for event routing** - Using `z.discriminatedUnion("type", [...])` enables type-safe routing to correct schema based on event.type field. More efficient than try/catch with individual schemas.

2. **Validate only accessed fields** - Schemas validate only fields actually used in webhook handlers (from route.ts analysis), using `.passthrough()` for other fields. This provides security without breaking on Stripe API evolution.

3. **Direct crypto.timingSafeEqual() demonstration** - While Stripe provides its own verification, this HMAC utility demonstrates SEC-01 compliance for future non-Stripe webhooks (e.g., Tarabut Gateway) requiring manual signature verification.

4. **Buffer length check before timingSafeEqual** - crypto.timingSafeEqual() throws RangeError if buffer lengths differ. We check lengths first and return error gracefully, preventing crashes on invalid signatures.

5. **Node environment for crypto tests** - Added `@vitest-environment node` comment to test file to avoid jsdom import errors for Node.js-specific crypto tests.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

**1. Vitest jsdom environment error for Node.js crypto tests**
- **Problem:** Default jsdom environment caused parse5 ESM import error when running crypto tests
- **Solution:** Added `@vitest-environment node` comment to override environment for Node.js-specific tests
- **Impact:** Tests now run in correct environment, no functional changes needed

**2. Test failure for "signature too long" case**
- **Problem:** Adding "extra_bytes" to hex string created valid hex characters, so buffer lengths matched unexpectedly
- **Solution:** Changed test to add "00" (explicit hex bytes) instead of arbitrary string
- **Impact:** Test now correctly verifies buffer length mismatch handling

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for Plan 02 (Stripe webhook integration with Zod validation):**
- Zod schemas ready to be integrated into route.ts
- HMAC utility available for future non-Stripe webhooks
- Test patterns established for security utilities

**What Plan 02 needs:**
- Integrate StripeWebhookEventSchema into webhook route handler
- Add runtime validation before type casting
- Add error handling for validation failures
- Update tests to verify validation behavior

**No blockers or concerns.**

---
*Phase: 02-webhook-security*
*Completed: 2026-01-25*
