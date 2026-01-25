# Requirements: Finaura Stabilization

**Defined:** 2026-01-25
**Core Value:** Users can trust their financial data is handled securely and the app behaves correctly in all scenarios.

## v1 Requirements

Requirements for this stabilization milestone. Each includes tests, monitoring, and documentation.

### Bug Fixes

- [ ] **FIX-01**: Rate limiter fails closed (blocks requests) when database unavailable instead of failing open (allowing unlimited requests)
- [ ] **FIX-02**: Consent middleware returns consistent error responses for all edge cases (no consent, expired, revoked, no banks)
- [ ] **FIX-03**: PWA displays indicator when showing cached/stale data so users know information may be outdated

### Security Hardening

- [ ] **SEC-01**: Webhook secret comparisons use `crypto.timingSafeEqual()` to prevent timing attacks
- [ ] **SEC-02**: Tarabut API calls check `token_expires_at` and refresh tokens before making requests
- [ ] **SEC-03**: Stripe webhook payloads validated with Zod schema before any `as string` type casting
- [ ] **SEC-04**: Admin access controlled via database table with audit logging instead of environment variable
- [ ] **SEC-05**: Prompt injection detection has comprehensive test suite covering known attack patterns

### Feature Completion

- [ ] **FEAT-01**: Users receive email notifications for upcoming invoices (3 days before) and failed payments
- [ ] **FEAT-02**: Feature usage counters (savings goals, family members) query actual database counts instead of returning 0
- [ ] **FEAT-03**: Family tier references consolidated into Pro tier with clear code comments explaining the merge

## v2 Requirements

Deferred to next milestone. Tracked but not in current roadmap.

### Performance

- **PERF-01**: Finance manager uses `Promise.all()` for independent database queries
- **PERF-02**: Spending analysis uses database aggregations instead of loading 12 months into memory
- **PERF-03**: Budget calculations batched into single RPC call instead of N+1
- **PERF-04**: Recurring expense detection cached with TTL
- **PERF-05**: Anomaly detection uses indexed queries with sampling for large datasets

### Tech Debt

- **DEBT-01**: Replace `any` type casts with proper TypeScript types
- **DEBT-02**: Centralize Supabase client initialization into shared module
- **DEBT-03**: Consolidate duplicate rate limiting implementations
- **DEBT-04**: Implement consistent pagination strategy across API endpoints

## Out of Scope

| Feature | Reason |
|---------|--------|
| New features | This is a stabilization milestone only |
| UI/UX changes | Focus on backend correctness |
| Database schema changes | Minimize risk during stabilization |
| Third-party service migrations | Keep existing integrations stable |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| FIX-01 | TBD | Pending |
| FIX-02 | TBD | Pending |
| FIX-03 | TBD | Pending |
| SEC-01 | TBD | Pending |
| SEC-02 | TBD | Pending |
| SEC-03 | TBD | Pending |
| SEC-04 | TBD | Pending |
| SEC-05 | TBD | Pending |
| FEAT-01 | TBD | Pending |
| FEAT-02 | TBD | Pending |
| FEAT-03 | TBD | Pending |

**Coverage:**
- v1 requirements: 11 total
- Mapped to phases: 0
- Unmapped: 11

---
*Requirements defined: 2026-01-25*
*Last updated: 2026-01-25 after initial definition*
