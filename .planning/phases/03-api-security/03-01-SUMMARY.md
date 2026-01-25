---
phase: 03-api-security
plan: 01
subsystem: api
tags: [oauth2, token-management, async-mutex, tarabut, open-banking]

# Dependency graph
requires:
  - phase: 02-webhook-security
    provides: Tested infrastructure and security patterns
provides:
  - TarabutTokenManager class with proactive token expiry checking
  - Mutex-based concurrency control for token refresh
  - 5-minute buffer window (configurable) for token expiry
  - shouldUpdate flag pattern for database persistence
affects: [03-02-api-routes, future-tarabut-integration]

# Tech tracking
tech-stack:
  added: [async-mutex]
  patterns:
    - "Proactive token refresh with buffer window"
    - "Mutex per user for concurrent request serialization"
    - "Double-check pattern with lastRefreshTime tracking"

key-files:
  created:
    - lib/tarabut/token-manager.ts
    - lib/tarabut/token-manager.test.ts
  modified: []

key-decisions:
  - "5-minute default buffer window for token expiry (configurable)"
  - "Mutex per user prevents concurrent refresh race conditions"
  - "Double-check pattern: track lastRefreshTime to prevent redundant refreshes within 10 seconds"
  - "shouldUpdate flag pattern: caller must persist token if true"

patterns-established:
  - "Token refresh returns { accessToken, shouldUpdate, expiresAt } - caller responsible for DB update"
  - "Singleton tokenManager export for easy consumption"
  - "Per-user mutex via Map<userId, Mutex> for serialization"

# Metrics
duration: 6min
completed: 2026-01-25
---

# Phase 03 Plan 01: TarabutTokenManager Summary

**Proactive Tarabut token refresh with 5-minute buffer window and mutex-based concurrency control using async-mutex**

## Performance

- **Duration:** 6 min
- **Started:** 2026-01-25T21:14:28Z
- **Completed:** 2026-01-25T21:20:06Z
- **Tasks:** 1 TDD feature (3 commits: test → feat → refactor)
- **Files modified:** 2 created, 2 updated (package files)

## Accomplishments

- TarabutTokenManager class checks token expiry BEFORE API calls (prevents 401 errors)
- Mutex per user prevents concurrent refresh race conditions (no duplicate API calls)
- Configurable buffer window (default 5 minutes) triggers proactive refresh
- Comprehensive test suite (8 tests) covering validity checks, buffer window, mutex behavior

## Task Commits

TDD cycle produced 3 atomic commits:

1. **RED: Add failing test** - `3f5aed6` (test)
   - Tests for token validity, buffer window, expired tokens
   - Tests for mutex preventing concurrent refreshes
   - Tests for configurable buffer time
   - Tests for parallel refresh of different users

2. **GREEN: Implement TarabutTokenManager** - `c5a23a0` (feat)
   - Proactive expiry check with buffer time
   - Mutex per user for serialization
   - Double-check pattern with lastRefreshTime
   - Returns { accessToken, shouldUpdate, expiresAt }
   - Install async-mutex dependency

3. **REFACTOR: Extract helper methods** - `6112717` (refactor)
   - Extract DOUBLE_CHECK_WINDOW_MS constant (10 seconds)
   - Extract isTokenExpiringSoon() method
   - Improve code clarity

## Files Created/Modified

- `lib/tarabut/token-manager.ts` - Token manager class with mutex concurrency control
- `lib/tarabut/token-manager.test.ts` - Comprehensive test suite (8 tests, 211 lines)
- `package.json` - Added async-mutex dependency
- `package-lock.json` - Dependency lockfile updated

## Decisions Made

**1. 5-minute default buffer window**
- Rationale: Industry standard for 1-hour access tokens, prevents token expiry during API call latency
- Configurable via TokenManagerOptions for different token lifetimes

**2. Mutex per user (not global)**
- Rationale: Different users can refresh in parallel, only same user requests are serialized
- Implementation: Map<userId, Mutex> for per-user locking

**3. Double-check pattern with lastRefreshTime**
- Rationale: Without re-fetching from DB, need to prevent redundant refreshes from concurrent requests
- Implementation: Track last refresh timestamp, skip if < 10 seconds ago
- Note: In production, API routes will re-fetch from DB to get updated token

**4. shouldUpdate flag pattern**
- Rationale: Token manager doesn't know about database layer, caller must persist
- Clear contract: if shouldUpdate=true, caller MUST update database

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

**1. Vitest jsdom environment error**
- Issue: Test initially tried to run in jsdom environment, caused parse5 CommonJS/ESM error
- Resolution: Added `@vitest-environment node` comment to test file (no DOM needed for this test)
- Impact: No delay, tests ran successfully after fix

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready for 03-02-PLAN.md (Integrate token manager into Tarabut API routes):

- TarabutTokenManager fully tested and working
- Clear usage pattern: call getValidToken(), check shouldUpdate, persist if needed, use accessToken
- Mutex prevents race conditions in concurrent scenarios
- Buffer window ensures tokens refreshed before expiry

**No blockers or concerns.**

---
*Phase: 03-api-security*
*Completed: 2026-01-25*
