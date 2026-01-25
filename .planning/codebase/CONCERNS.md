# Codebase Concerns

**Analysis Date:** 2026-01-25

## Tech Debt

**Missing Email Notifications for Payment Events:**
- Issue: Payment milestone emails are marked as TODO but not implemented
- Files: `app/api/webhooks/stripe/route.ts` (lines 493, 525)
- Impact: Users don't receive email notifications about upcoming payments or failed payments, reducing payment visibility and reducing time to address payment issues
- Fix approach: Implement email notifications using Resend service in `handleUpcomingInvoice()` and `handlePaymentFailed()` functions. Reference existing email templates in `lib/email.ts`

**Incomplete Feature Usage Tracking:**
- Issue: Savings goals and family members usage counts are hardcoded to 0, blocking feature enforcement
- Files:
  - `app/api/subscription/route.ts` (lines 283, 287)
  - `hooks/use-feature-access.ts` (lines 94, 95)
- Impact: Subscription tier limits for savings goals and family members cannot be enforced. Users can exceed their plan limits undetected
- Fix approach: Query `savings_goals` and `family_members` tables to count actual user resources. Add caching layer to avoid repeated queries

**Type Safety Issues with @ts-ignore Pragmatism:**
- Issue: Multiple `as any` type casts used to bypass Supabase type system
- Files: `lib/ratelimit.ts` (lines 92-93, 102-103)
- Impact: Silent failures possible if Supabase API response shape changes. No IDE autocomplete protection for rate limit updates
- Fix approach: Either fix Supabase client typing or create proper type wrapper for rate limit operations

**Admin Access Control Not Standardized:**
- Issue: Admin check relies on environment variable string split instead of proper role-based system
- Files: `app/api/admin/feature-flags/route.ts` (line 14)
- Impact: Adding/removing admins requires environment variable changes and redeployment. No audit trail for admin access changes
- Fix approach: Implement database-backed admin role system in `profiles` table with proper audit logging

## Known Bugs

**Callback Status Handling Inconsistency:**
- Symptoms: Tarabut callback accepts both "SUCCESSFUL" and "SUCCESS" status strings but may miss other cases
- Files: `app/api/tarabut/callback/route.ts` (lines 55-56)
- Trigger: When Tarabut API changes status enum or returns unexpected casing
- Workaround: None. Manual database cleanup required if connection stuck in pending state

**Race Condition in Bank Connection Flow:**
- Symptoms: Multiple bank connection attempts for same user could process concurrently, creating duplicate connections
- Files: `app/api/tarabut/callback/route.ts` (lines 87-94, 172-181)
- Trigger: User clicking multiple times during redirect, or callback retries
- Workaround: Manual deletion of duplicate bank_connections entries

## Security Considerations

**Environment Variables Required at Startup:**
- Risk: Missing environment variables (ANTHROPIC_API_KEY, STRIPE_SECRET_KEY, RESEND_API_KEY) cause initialization failures but allow app to run in degraded state
- Files: `app/api/chat/route.ts` (line 23), `lib/email.ts` (lines 32, 118, 201, 281, 347, 426, 496)
- Current mitigation: Runtime checks before usage, but no startup validation
- Recommendations: Add startup validation script in Next.js config or separate health check endpoint that validates all required env vars

**Webhook Secret Validation Missing Cryptographic Timing Comparison:**
- Risk: String comparison for webhook signature could be vulnerable to timing attacks
- Files: `app/api/cron/expire-consents/route.ts` (line 17) - basic string comparison
- Current mitigation: Uses process.env.CRON_SECRET but no constant-time comparison
- Recommendations: Use `crypto.timingSafeEqual()` for all secret comparisons

**Tarabut Token Expiry Not Enforced:**
- Risk: Access tokens stored in bank_connections table are used without checking expiry time
- Files: `app/api/tarabut/callback/route.ts` (line 178 - stores token_expires_at but line 243+ uses without checking)
- Current mitigation: Token refresh not implemented before API calls
- Recommendations: Check `token_expires_at` before making Tarabut API calls and implement token refresh flow

**Stripe Type Casting with `as string`:**
- Risk: Stripe object properties cast to string without null checks could cause type mismatches
- Files: `app/api/webhooks/stripe/route.ts` (multiple lines: 142, 143, 183, 260, 306, 384, 412, 447, 478, 501)
- Current mitigation: None - relies on Stripe payload being well-formed
- Recommendations: Validate Stripe object shape with runtime schema validation (Zod) before type casting

**Prompt Injection Prevention Incomplete:**
- Risk: HIGH_RISK patterns blocked but conversation history sanitization limits may be insufficient against sophisticated attacks
- Files: `lib/ai/sanitize.ts` (lines 7-27, 101)
- Current mitigation: Pattern matching and length limits (MAX_MESSAGE_LENGTH=2000, MAX_HISTORY_MESSAGES=20)
- Recommendations: Add rate limiting on security event frequency, implement user context redaction in conversation history, add test suite for injection patterns

## Performance Bottlenecks

**N+1 Query Pattern in Tarabut Callback:**
- Problem: Fetches balance for each account sequentially instead of batching
- Files: `app/api/tarabut/callback/route.ts` (lines 238-249)
- Cause: Loop calls `client.getAccountBalance()` for every filtered account one at a time
- Improvement path: Batch balance requests or use Tarabut's bulk endpoints if available. Add transaction wrapping for account creation

**Rate Limit Checks Implemented Twice with Different Strategies:**
- Problem: Two separate rate limiting systems exist with different implementations
- Files: `lib/ratelimit.ts` (basic Supabase check) vs `lib/ai/rate-limit.ts` (RPC-based with atomic operations)
- Cause: Evolved during development without consolidation
- Improvement path: Merge into single rate limiting module. Standardize on RPC approach for atomicity

**No Query Result Pagination for Large Datasets:**
- Problem: Data exports, transaction lists, and consent lists could return unbounded result sets
- Files: `app/api/user/data-export/route.ts` (line 28 - limits to 10), `app/api/tarabut/callback/route.ts` (no limit on accounts list)
- Cause: No consistent pagination strategy across API endpoints
- Improvement path: Implement cursor-based pagination with consistent page size defaults

## Fragile Areas

**Tarabut Integration - Callback Handler:**
- Files: `app/api/tarabut/callback/route.ts`
- Why fragile: Complex multi-step process with many database operations, external API calls, and cleanup logic. Multiple error conditions (missing connection, failed consent, no accounts) each trigger cleanup but inconsistently
- Safe modification: Add idempotency key tracking, wrap all multi-step operations in transactions, add comprehensive logging at each step. Extract cleanup logic into separate function
- Test coverage: Missing integration tests for failure scenarios (network failures, partial account list returns, concurrent requests)

**Stripe Webhook Handler - Multiple Unchecked Type Casts:**
- Files: `app/api/webhooks/stripe/route.ts`
- Why fragile: Eleven instances of `as string` casting without validation. If Stripe changes payload shape or webhook retries fire out of order, subscription state becomes inconsistent
- Safe modification: Validate webhook payload with Zod schema before type casting. Add idempotency checking using event ID
- Test coverage: No tests for edge cases (duplicate webhooks, out-of-order events, missing metadata)

**Feature Usage Counting - Hardcoded Zeros:**
- Files: `app/api/subscription/route.ts`, `hooks/use-feature-access.ts`
- Why fragile: Users can exceed tier limits silently. Displays incorrect usage numbers to frontend
- Safe modification: Implement actual counting queries, cache results with 5-minute TTL to avoid repeated database hits
- Test coverage: Missing tests for subscription tier boundary conditions

**Admin Access Control - String Split from Env:**
- Files: `app/api/admin/feature-flags/route.ts`
- Why fragile: Single admin check dependency, no audit trail, environment variable parsing could fail silently if comma formatting incorrect
- Safe modification: Move admin list to database table with timestamps. Add logging for all admin operations
- Test coverage: No tests for admin access verification

## Scaling Limits

**Rate Limiting - Supabase Database Dependency:**
- Current capacity: Every API request requiring rate limit checks queries Supabase rate_limits table. No upper bound on table growth
- Limit: At 1000+ concurrent users, rate_limits table queries become bottleneck. Table scan grows linearly with user base
- Scaling path: Implement Redis-based rate limiting for per-minute limits (fast), keep Supabase only for daily/hourly limits. Add cleanup cron job to remove expired rate limit records

**Stripe Webhook Event Processing - Sequential:**
- Current capacity: Webhooks processed one at a time. Each webhook makes multiple Supabase queries
- Limit: At high payment volume, webhooks queue up and processing lags, leading to subscription state inconsistencies
- Scaling path: Implement queue system (Supabase queue or Bull.js) for webhook processing. Process webhooks in parallel batches

**Tarabut Sync Operation - Blocking:**
- Current capacity: `/api/tarabut/sync` endpoint fetches all transactions for all accounts sequentially
- Limit: Users with 10+ accounts experience timeout (Next.js default 30 second timeout)
- Scaling path: Implement background job system for data sync. Split sync into account-level parallelizable tasks. Return 202 Accepted with job ID instead of blocking

## Dependencies at Risk

**Anthropic SDK - Custom Type Casting:**
- Risk: AI mode implementation relies on type safety for parsing AI response JSON. If Anthropic SDK types change, parsing fails silently
- Impact: Chat fails with "No text content in response" without clear error message
- Migration plan: Add runtime JSON schema validation using Zod before any type casting. Log full Anthropic response for debugging

**Resend Email Service - Silent Failures:**
- Risk: Email send failures are logged but not retried. Consent expiry warnings never sent if service temporarily unavailable
- Impact: Users lose bank connections without warning
- Migration plan: Implement exponential backoff retry logic. Store failed emails in database queue for manual retry. Add metrics for email delivery rate

**Tarabut Open Banking SDK - Token Expiry Tracking:**
- Risk: Token expiry logic depends on Tarabut's expiresIn parameter. No validation against actual token format or Tarabut API changes
- Impact: Sync fails with cryptic Tarabut error instead of token refresh error
- Migration plan: Implement automatic token refresh before expiry. Add circuit breaker for repeated Tarabut failures

## Missing Critical Features

**Data Retention Policy Compliance:**
- Problem: PDPL requires data deletion capability but manual cleanup via cron job has no UI for user initiation
- Blocks: Users cannot easily request their data be deleted. Manual admin intervention required
- Impact: Regulatory compliance risk if users contest data retention

**Audit Trail for Admin Actions:**
- Problem: Admin feature flag changes not logged with who changed what when
- Blocks: Cannot track feature flag change history or identify unauthorized changes
- Impact: Limited debugging capability and compliance issues for regulated features

**Idempotency for Critical Operations:**
- Problem: No idempotency keys on subscription changes, bank connections, or consent updates
- Blocks: Webhook retries or network failures can cause duplicate operations
- Impact: Users could be charged twice for subscription upgrades or have duplicate consent records

## Test Coverage Gaps

**Webhook Event Processing:**
- What's not tested: Order independence of webhook events, duplicate event handling, partial failures in multi-step operations
- Files: `app/api/webhooks/stripe/route.ts`, `app/api/tarabut/callback/route.ts`
- Risk: Subscription state becomes inconsistent on edge cases like network retries or out-of-order events
- Priority: High - directly impacts revenue and user account state

**Bank Integration Failure Scenarios:**
- What's not tested: Network failures during account fetch, partial account lists, token refresh failures, provider changes
- Files: `app/api/tarabut/callback/route.ts`, `app/api/tarabut/sync/route.ts`
- Risk: Stale bank data or connections stuck in pending state
- Priority: High - blocks core feature (bank connections)

**Subscription Tier Enforcement:**
- What's not tested: Usage counting accuracy, tier boundary conditions, feature access for different tiers
- Files: `app/api/subscription/route.ts`, `hooks/use-feature-access.ts`
- Risk: Revenue loss if users exceed tier limits without charge
- Priority: High - directly impacts monetization

**Prompt Injection and AI Safety:**
- What's not tested: Known jailbreak patterns, conversation history poisoning, excessive context attacks
- Files: `lib/ai/sanitize.ts`, `app/api/chat/route.ts`
- Risk: AI safety measures bypassed, sensitive data leaked via AI
- Priority: Medium - security/privacy impact

**Admin Access Control:**
- What's not tested: Invalid email formats in ADMIN_EMAILS, admin access revocation, audit logging
- Files: `app/api/admin/feature-flags/route.ts`
- Risk: Unauthorized admin access or orphaned admin accounts
- Priority: Medium - security impact

---

*Concerns audit: 2026-01-25*
