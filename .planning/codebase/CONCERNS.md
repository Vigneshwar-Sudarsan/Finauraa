# Codebase Concerns

**Analysis Date:** 2026-01-25

## Tech Debt

**Type Casting with `@typescript-eslint/no-explicit-any`:**
- Issue: Multiple locations bypass TypeScript type safety by casting to `any`
- Files: `app/api/webhooks/stripe/route.ts` (lines 93, 102, 322), `lib/ratelimit.ts` (lines 92, 102)
- Impact: Reduces type safety, obscures potential runtime errors, makes refactoring harder
- Fix approach: Use proper TypeScript types instead of `any`. In `stripe/route.ts`, properly type Supabase client with correct method signatures. In `ratelimit.ts`, define proper response types for RPC calls.

**Incomplete Payment Notification Features:**
- Issue: Two TODOs for email notifications remain unimplemented since payment features were added
- Files: `app/api/webhooks/stripe/route.ts` (lines 493, 525)
- Impact: Users don't receive notifications for upcoming invoices or failed payments beyond what's already handled in `handleInvoicePayment`
- Fix approach: Implement email notifications for `handleUpcomingInvoice()` and `handlePaymentFailed()`. Use existing `sendPaymentFailedNotification` pattern from `lib/email.ts`.

**Incomplete Feature Flags Usage Counters:**
- Issue: Placeholder TODOs for counting savings goals and family members in subscription tier calculations
- Files: `app/api/subscription/route.ts` (lines 316, 320)
- Impact: Tier limits and feature usage tracking incomplete; users may have inaccurate usage data in subscription endpoints
- Fix approach: Query `savings_goals` table for active goals and `family_members` table for member count, integrate into `calculateUsage()` function.

**Global Singleton Pattern for External Clients:**
- Issue: Lazy-initialized global variables for Stripe and Supabase clients in multiple files
- Files: `app/api/webhooks/stripe/route.ts` (lines 8-22, 24-32), `app/api/subscription/route.ts` (lines 8-32), `lib/ratelimit.ts` (lines 7-20)
- Impact: Potential for stale client instances, no hot-reload capability in development, makes testing harder
- Fix approach: Move client initialization to a shared utility module with proper singleton pattern and testability. Consider using dependency injection in tests.

## Known Bugs

**PWA Cache Timeout Configuration Edge Case:**
- Symptoms: PWA caches all HTTP/HTTPS requests with 3-second network timeout; offline users always see cached data regardless of recency
- Files: `next.config.ts` (lines 15-26)
- Trigger: When user goes offline, if any network request takes >3 seconds, cache is used without user awareness that data might be stale
- Workaround: Cache has 24-hour max age, so data is at most 24 hours old. Service worker reloads on online if `reloadOnOnline` is true (line 8).
- Fix approach: Add cache versioning strategy or cache headers to differentiate between "fresh" and "stale" data shown to users. Consider user-facing indicator when viewing cached data.

**Rate Limit Fail-Open Behavior:**
- Symptoms: If Supabase is down or rate_limits table query fails, all requests are allowed (fail-open)
- Files: `lib/ratelimit.ts` (lines 43-46, 64, 114)
- Trigger: Supabase configuration missing, database connection timeout, or `rate_limits` table missing
- Workaround: None - users can perform unlimited operations if rate limiter fails
- Fix approach: Implement fail-close behavior with exponential backoff. Add monitoring/alerts for rate limit check failures. Fall back to per-process in-memory rate limiting as secondary mechanism.

**Consent Middleware Inconsistent Handling:**
- Symptoms: When user has bank connections but no consent, error is 403. When user has no connections at all, request is allowed with empty data. Creates inconsistent UX.
- Files: `lib/consent-middleware.ts` (lines 50-60, 105-111)
- Trigger: User deletes all bank connections; then API returns empty data instead of 403. Switching back triggers consent errors.
- Workaround: Frontend must handle both cases independently
- Fix approach: Standardize to either always requiring explicit consent after first connection, or make initial connection itself the consent mechanism. Document this behavior clearly.

## Security Considerations

**Stripe API Version Hardcoded:**
- Risk: Using a specific Stripe API version (`2025-12-15.clover`) locks implementation to that version; breaking changes in future versions could cause failures
- Files: `app/api/webhooks/stripe/route.ts` (line 18), `app/api/subscription/route.ts` (line 18)
- Current mitigation: Version explicitly pinned prevents unexpected changes
- Recommendations: Document version rationale, set up Stripe webhook version testing, monitor Stripe API changelog. Consider using environment variable for version so it can be updated without code changes.

**Stripe Webhook Secret Unenforced:**
- Risk: If `STRIPE_WEBHOOK_SECRET` is missing, signature verification will fail but error handling is generic
- Files: `app/api/webhooks/stripe/route.ts` (lines 40-57)
- Current mitigation: Signature verification happens for all requests (line 49-57)
- Recommendations: Add explicit check that webhook secret is configured before runtime. Log which secrets are missing at startup. Add webhook signature validation test to ensure it actually rejects invalid signatures.

**Admin Client Used for Cross-User Data:**
- Risk: Admin Supabase client used in subscription endpoint to read family group owner's subscription tier
- Files: `app/api/subscription/route.ts` (lines 76-93)
- Current mitigation: Only reads `subscription_tier` and `owner_id`, doesn't modify data. RLS is bypassed intentionally.
- Recommendations: Add audit logging for family tier inheritance checks. Ensure family group ownership cannot be hijacked. Add integration tests verifying family members can only see their own family's subscription tier.

**Unencrypted Rate Limit Storage:**
- Risk: Rate limit data (user_id, count, timestamps) stored plaintext in database
- Files: `lib/ratelimit.ts` (lines 53-108)
- Current mitigation: Supabase RLS policies should restrict access. Rate limits themselves aren't sensitive data.
- Recommendations: Ensure `rate_limits` table has proper RLS policies. Monitor for abuse patterns. Consider adding IP-based rate limiting as secondary mechanism.

**Financial Data Scope Creep:**
- Risk: Enhanced AI mode with `enhanced_ai_consent_given_at` flag can share full transaction history with AI provider without per-transaction consent
- Files: `lib/ai/data-privacy.ts` (lines 485-514)
- Current mitigation: Consent is explicit (Pro tier + consent flag), user can see what data is sent, privacy-first mode is default
- Recommendations: Add consent expiration with mandatory re-confirmation. Log all enhanced AI context fetches. Provide data download capability so users can verify what was sent. Consider per-query consent flow instead of blanket consent.

## Performance Bottlenecks

**Synchronous Database Queries in Finance Manager:**
- Problem: `getFinanceManagerContext()` performs 10+ sequential database queries to fetch transactions, budgets, goals, family data
- Files: `lib/ai/finance-manager.ts` (lines 777-941)
- Cause: Queries executed one-by-one; each waits for previous to complete
- Impact: Finance dashboard and AI context endpoint slow for users with many transactions (90-day window queries entire transaction history)
- Improvement path:
  - Use `Promise.all()` for independent queries (accounts, budgets, goals can fetch in parallel)
  - Implement database-level aggregations for spending patterns instead of client-side grouping
  - Add transaction pagination/streaming for large datasets
  - Cache 12-month summary calculation with invalidation on new transactions

**Spending Pattern Analysis Over Full 12 Months:**
- Problem: `analyzeSpendingPatterns()` loads 12 months of ALL transactions and groups by category and month in memory
- Files: `lib/ai/finance-manager.ts` (lines 171-240)
- Cause: No pagination, no aggregation at database level
- Impact: For users with 10,000+ transactions, this becomes slow and memory-intensive
- Improvement path: Use database window functions or CTEs to compute monthly category totals, return only summaries instead of raw transactions

**Anomaly Detection Full 90-Day Scan:**
- Problem: Detects anomalies by scanning 90 days of transactions and comparing to 30-day historical window
- Files: `lib/ai/finance-manager.ts` (lines 699-772)
- Cause: No indexing on transaction dates or merchants; full table scan
- Impact: Slow for users with large transaction volume
- Improvement path: Add database indexes on (`user_id`, `transaction_date`), implement query result caching, implement sampling strategy for very large datasets

**Budget Calculation RPC Called Per Budget:**
- Problem: Each active budget requires a separate RPC call to `calculate_budget_spent()`
- Files: `lib/ai/finance-manager.ts` (lines 909-941)
- Cause: No batch RPC support, must call sequentially
- Impact: User with 10+ budgets experiences N+1 query problem (1 main query + N RPC calls)
- Improvement path: Implement single batch RPC that calculates spending for all budgets at once, refactor RPC to accept array of budget periods

**Recurring Expense Detection Heuristics:**
- Problem: Three-tier detection strategy (merchant, category, amount) with no caching, runs on every finance context fetch
- Files: `lib/ai/finance-manager.ts` (lines 314-416)
- Cause: Heuristics are complex (checking date intervals, amount variance) but results never cached
- Impact: Every AI request recalculates recurring expenses even if no new transactions
- Improvement path: Cache recurring expense detection results with TTL, invalidate only on new transactions, store detected bills in database

## Fragile Areas

**Stripe Webhook Handler Completeness:**
- Files: `app/api/webhooks/stripe/route.ts`
- Why fragile:
  - Handles 11 different event types with different payloads
  - Missing payment intent failed notification (line 525 TODO)
  - Implicit assumptions about subscription items array structure (line 198-199, 425-426)
  - Fallback to "pro" tier if price ID unknown (line 552) silently masks configuration errors
- Safe modification:
  - Add type guards for all event payload shapes
  - Test each event type individually with real Stripe webhook samples
  - Add logging for tier mapping failures so misconfigured price IDs are caught early
  - Add integration test that simulates complete subscription lifecycle (create, update, payment, cancel)
- Test coverage: Gaps in testing for payment_failed events and edge cases like missing subscription items

**Consent Middleware Logic:**
- Files: `lib/consent-middleware.ts`
- Why fragile:
  - Complex error state handling with 4 error codes (lines 74-111)
  - Requires exact database schema match (specific table and column names)
  - No validation that consent_expires_at is actually in future
  - Fallback to PGRST116 error code assumes Supabase error format
- Safe modification:
  - Add runtime checks that consent expiration is in future
  - Create test fixtures with mock Supabase responses for all code paths
  - Add explicit schema validation before use
  - Document all assumptions about database structure
- Test coverage: Missing tests for expired consent edge cases (time exactly at expiry)

**Finance Analysis Context Builder:**
- Files: `lib/ai/finance-manager.ts` (entire file, 1136 lines)
- Why fragile:
  - Single monolithic function with 10+ sub-functions, deep nesting, implicit dependencies
  - Hard-coded category lists for budget recommendations and recurring expense detection
  - Rounding logic appears in 50+ places (`Math.round(...* 1000) / 1000`)
  - Conversions between different time windows (30, 90, 365 days) for same calculation
  - Assumes transaction amounts are always divisible by absolute value
- Safe modification:
  - Extract finance calculations into separate service class with explicit dependencies
  - Create constants file for category lists, rounding precision, time windows
  - Add decimal/currency handling library instead of float arithmetic
  - Add comprehensive unit tests for each calculation function
- Test coverage: Lacks unit tests for individual calculations; only integration tests possible

**Rate Limit Supabase Integration:**
- Files: `lib/ratelimit.ts`
- Why fragile:
  - Assumes `rate_limits` table exists with exact schema
  - Fail-open on any error (lines 43-46, 64, 114) means misconfiguration silently disabled rate limiting
  - No transaction support; race condition possible between read and write (lines 69-99)
  - Casting to `any` hides type safety issues in schema changes
- Safe modification:
  - Add schema migration check at server startup
  - Implement transactional increment operation in database
  - Add logging/monitoring when rate limit check fails
  - Use TypeScript types instead of `any` for Supabase responses
- Test coverage: Missing tests for concurrent requests and race conditions

## Scaling Limits

**Database Query Volume:**
- Current capacity: ~100 monthly active users assumed based on MVP architecture
- Limit: Finance context generation requires 10+ queries per user per request; at 1000 users with daily context refreshes = 10,000+ queries/day
- Scaling path:
  - Implement caching layer (Redis) for finance context with 15-minute TTL
  - Pre-compute and store yearly summaries nightly as scheduled task
  - Implement query result pagination for large datasets
  - Add database read replicas for analytics queries

**Transaction Volume Growth:**
- Current capacity: System loads 12 months of transactions into memory for analysis
- Limit: At 10,000+ transactions per user, memory usage becomes problematic; analysis becomes slow
- Scaling path:
  - Implement streaming/pagination for transaction queries
  - Move analysis to database-level computed columns or materialized views
  - Archive old transactions to separate table/schema after 2 years
  - Use time-series database (TimescaleDB) for transaction data

**Stripe Webhook Processing:**
- Current capacity: Single webhook handler processes sequentially
- Limit: At high payment volume (1000+ transactions/hour), sequential processing creates backlog
- Scaling path:
  - Implement message queue (Bull, RabbitMQ) for webhook events
  - Add webhook processing job workers
  - Implement idempotency keys to handle retries safely
  - Add webhook delivery monitoring and retry logic

**Rate Limit Table Growth:**
- Current capacity: One row per user per time window; grows indefinitely
- Limit: At 1000+ users, rate_limits table grows rapidly (1000 users × 12 limit types × daily records = unbounded)
- Scaling path:
  - Implement automatic cleanup of rate limit records older than 7 days
  - Archive historical rate limit data
  - Consider moving to Redis-based rate limiting instead of database
  - Implement distributed rate limiting for multi-instance deployments

## Dependencies at Risk

**@ducanh2912/next-pwa - PWA Plugin Maintenance:**
- Risk: Third-party PWA plugin may not receive updates for Next.js versions
- Impact: Cannot upgrade Next.js without risking PWA breakage; PWA features become outdated
- Migration plan:
  - Consider switching to Workbox directly for more control
  - Evaluate built-in Next.js PWA support if available
  - Current version (10.2.9) works with Next.js 16.1.3, but long-term support unknown

**Stripe API Version Lock:**
- Risk: Stripe may deprecate `2025-12-15.clover` API version
- Impact: Webhook handler and subscription endpoint stop working
- Migration plan:
  - Monitor Stripe API changelog quarterly
  - Test against latest stable Stripe API version in staging
  - Implement version upgrade testing as part of CI/CD

**Supabase Service Role Key in Multiple Files:**
- Risk: Service role key used in client initialization across codebase (stripe webhook, subscription, rate limit)
- Impact: If key is leaked, all services are compromised; key rotation requires changes in 3+ files
- Migration plan:
  - Centralize service role client initialization
  - Use environment-specific role keys
  - Implement automatic key rotation with versioning

## Missing Critical Features

**Email Notification System Incomplete:**
- Problem: Notification infrastructure exists but missing key triggers
- Blocks: Users don't receive payment failure alerts or upcoming invoice notifications
- Implementation priority: High (user retention)

**Family Tier Feature Incomplete:**
- Problem: Code references "family" tier in multiple places but marked as merged into Pro
- Blocks: Unclear if family tier should continue to exist or be fully consolidated into Pro
- Implementation priority: Medium (code clarity)

**Offline Functionality UX Gap:**
- Problem: PWA caches data but users don't know if they're viewing stale cached data
- Blocks: Users make decisions on potentially out-of-date financial information
- Implementation priority: Medium (data accuracy)

## Test Coverage Gaps

**Stripe Webhook Integration - Untested Areas:**
- What's not tested: Payment failure scenarios, subscription state transitions, tier fallback logic
- Files: `app/api/webhooks/stripe/route.ts`
- Risk: Webhook handling failures cause silent data inconsistencies between Stripe and database
- Priority: High

**Finance Manager Calculation Accuracy - Untested Areas:**
- What's not tested: Rounding edge cases, category detection accuracy, recurring expense detection accuracy with small datasets
- Files: `lib/ai/finance-manager.ts`
- Risk: Users see inaccurate financial summaries leading to poor financial decisions
- Priority: High

**Rate Limiting Under Concurrency - Untested Areas:**
- What's not tested: Race conditions in rate limit increment, behavior under high concurrent load, fail-open scenarios
- Files: `lib/ratelimit.ts`
- Risk: Rate limiting silently fails under load, allowing abuse
- Priority: High

**Consent Middleware State Transitions - Untested Areas:**
- What's not tested: Consent expiration edge cases, revoked consent state, multiple consent records
- Files: `lib/consent-middleware.ts`
- Risk: Users lose access to data unexpectedly or consent checks bypass silently
- Priority: Medium

**Family Feature Inheritance - Untested Areas:**
- What's not tested: Family member tier inheritance accuracy, family group deletion cascades, ownership transfer edge cases
- Files: `app/api/subscription/route.ts` (family group logic)
- Risk: Family members get wrong tier features, billing inconsistencies
- Priority: Medium

---

*Concerns audit: 2026-01-25*
