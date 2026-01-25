---
phase: 01-critical-infrastructure-fixes
plan: 02
subsystem: infra
tags: [consent, sentry, monitoring, error-handling, testing, vitest]

# Dependency graph
requires:
  - phase: 01-01
    provides: Fail-safe rate limiting pattern
provides:
  - Consistent consent error response structure
  - ConsentResult type with explicit allowed/denied variants
  - Sentry infrastructure monitoring configuration
  - Comprehensive consent middleware test coverage
affects: [api, open-banking, frontend-error-handling, monitoring]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Factory pattern for consistent error responses
    - Explicit type discrimination for consent results
    - Sentry tagging for infrastructure errors

key-files:
  created:
    - sentry.server.config.ts
    - sentry.client.config.ts
    - lib/__tests__/consent-middleware.test.ts
  modified:
    - lib/consent-middleware.ts

key-decisions:
  - "NO_BANKS intentionally returns allowed (empty data) not 403 - new users shouldn't see errors"
  - "CHECK_FAILED doesn't require re-consent (database error, not consent issue)"
  - "All error responses use consistent factory with message/code/requiresConsent"

patterns-established:
  - "ConsentResult type: Explicit allowed/denied variants using discriminated unions"
  - "createConsentError factory: Single source of truth for error response structure"
  - "Sentry tagging: component + failure_mode for infrastructure alerts"

# Metrics
duration: 8min
completed: 2026-01-25
---

# Phase 01 Plan 02: Consent Middleware Consistency Summary

**Unified consent error handling with explicit allowed/denied types, Sentry infrastructure monitoring, and 8 comprehensive tests covering all edge cases**

## Performance

- **Duration:** 8 min
- **Started:** 2026-01-25T23:00:00Z
- **Completed:** 2026-01-25T23:08:00Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- Refactored consent middleware with explicit ConsentResult type (allowed/denied variants)
- All error responses now use consistent factory pattern with message/code/requiresConsent
- Configured Sentry server/client for infrastructure error monitoring with tagging
- Added 8 comprehensive tests covering all consent edge cases (100% pass rate)

## Task Commits

Each task was committed atomically:

1. **Task 1: Refactor consent middleware for consistent error responses** - `49348fc` (refactor)
2. **Task 2: Configure Sentry infrastructure alerts** - `0a2bbc8` (feat)
3. **Task 3: Write tests for consent middleware edge cases** - `017a267` (test)

## Files Created/Modified
- `lib/consent-middleware.ts` - Added ConsentResult type, createConsentError factory, Sentry logging for CHECK_FAILED
- `sentry.server.config.ts` - Server config with beforeSend hook for infrastructure error tagging
- `sentry.client.config.ts` - Client config with browser tracking and replay
- `lib/__tests__/consent-middleware.test.ts` - 8 tests covering all edge cases (no banks, valid, expired, revoked, no consent, check failed)

## Decisions Made

**Preserved intentional NO_BANKS behavior:**
The plan clarified that NO_BANKS returning `{ allowed: true, noBanksConnected: true }` is intentional design - new users who haven't connected banks should see empty dashboards, not 403 errors. This isn't inconsistency; it's correct UX. Refactored for clarity while preserving this behavior.

**CHECK_FAILED doesn't require re-consent:**
Database errors (CHECK_FAILED) set `requiresConsent: false` because the issue is infrastructure, not consent status. User shouldn't be redirected to consent flow for a transient database error.

**Sentry alert rules documented in comments:**
Actual alert setup happens in Sentry Dashboard (not code), so added detailed comment documentation for:
- Rate limiter fallback alerts (1 event in 1 minute)
- Consent middleware database errors (5 events in 5 minutes)

## Deviations from Plan

**1. [Rule 3 - Blocking] Fixed TypeScript error in Sentry config**
- **Found during:** Task 2 (Sentry server config)
- **Issue:** `event.tags?.failure_mode` could be number/symbol, not assignable to string[] for fingerprint
- **Fix:** Added explicit String() conversion: `String(failureMode || "unknown")`
- **Files modified:** sentry.server.config.ts
- **Verification:** Build passes TypeScript check
- **Committed in:** 0a2bbc8 (Task 2 commit)

**2. [Rule 3 - Blocking] Added vitest environment override**
- **Found during:** Task 3 (Running tests)
- **Issue:** Global jsdom environment caused ESM import error for server-side code
- **Fix:** Added `@vitest-environment node` comment to test file
- **Files modified:** lib/__tests__/consent-middleware.test.ts
- **Verification:** All 8 tests pass
- **Committed in:** 017a267 (Task 3 commit)

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both fixes necessary to unblock test execution and TypeScript compilation. No scope creep.

## Issues Encountered

**Audit logging errors in test stderr:**
The `requireBankConsent` test shows audit logging errors because it tries to create Supabase client (which needs Next.js request context). This is expected - we're testing consent logic in isolation, not audit logging. Tests still pass. Future improvement could mock the audit logger, but that's beyond this plan's scope.

## User Setup Required

**Sentry Dashboard configuration needed:**

1. Set `NEXT_PUBLIC_SENTRY_DSN` environment variable
2. Configure alert rules in Sentry Dashboard:
   - **Rate Limiter Fallback:** Filter `tags.component = 'rate_limiter' AND tags.failure_mode = 'database_unavailable'`, threshold 1 event/1 min
   - **Consent Middleware Error:** Filter `tags.component = 'consent_middleware' AND tags.failure_mode = 'database_error'`, threshold 5 events/5 min

See comments in `sentry.server.config.ts` for full alert rule documentation.

## Next Phase Readiness

**Ready for API integration:**
- Consent middleware now returns predictable, typed responses
- Frontend can rely on consistent error structure: `{ error, code, requiresConsent }`
- NO_BANKS case handled gracefully (empty data, not errors)
- Infrastructure failures monitored via Sentry with automatic alerting

**All tests passing:**
- 14 total tests (6 rate limiter + 8 consent middleware)
- Both core infrastructure pieces have comprehensive coverage

**No blockers for Phase 2.**

---
*Phase: 01-critical-infrastructure-fixes*
*Completed: 2026-01-25*
