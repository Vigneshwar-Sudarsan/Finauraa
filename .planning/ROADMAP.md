# Roadmap: Finaura Stabilization

## Overview

This milestone transforms Finaura from 80% complete to production-ready by fixing critical bugs, hardening security vulnerabilities, and completing unfinished features. The journey progresses from foundational infrastructure fixes (rate limiting, consent) through security hardening (webhooks, APIs, AI) to user-facing completeness (notifications, counters, PWA indicators). Every fix includes tests, monitoring, and documentation to ensure reliability.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Critical Infrastructure Fixes** - Fix rate limiter and consent middleware bugs ✓
- [ ] **Phase 2: Webhook Security** - Harden webhook authentication and validation
- [ ] **Phase 3: API Security** - Secure external API integrations
- [ ] **Phase 4: AI Security** - Complete prompt injection protection
- [ ] **Phase 5: User-Facing Features** - Implement payment notifications and usage tracking
- [ ] **Phase 6: PWA Enhancement** - Add cache staleness indicators

## Phase Details

### Phase 1: Critical Infrastructure Fixes
**Goal**: Application fails safely and consistently when core infrastructure (database, consent) encounters edge cases
**Depends on**: Nothing (first phase)
**Requirements**: FIX-01, FIX-02
**Success Criteria** (what must be TRUE):
  1. Rate limiter blocks all requests when database is unavailable (fail-closed behavior)
  2. Rate limiter falls back to in-memory limiting when Supabase fails
  3. Consent middleware returns identical error structure for all edge cases (no consent, expired, revoked, no banks)
  4. API endpoints handle missing consent consistently without frontend special cases
  5. All infrastructure failures are logged with actionable alerts
**Plans**: 2 plans

Plans:
- [x] 01-01-PLAN.md - Testing infrastructure + rate limiter with in-memory fallback ✓
- [x] 01-02-PLAN.md - Consent middleware consistency + Sentry alerting ✓

### Phase 2: Webhook Security
**Goal**: Webhook handlers are protected against timing attacks and malformed payloads
**Depends on**: Phase 1 (infrastructure must be stable before securing webhooks)
**Requirements**: SEC-01, SEC-03
**Success Criteria** (what must be TRUE):
  1. All webhook secret comparisons use timing-safe equality checks
  2. Stripe webhook payloads are validated with Zod schemas before type casting
  3. Invalid webhook signatures are rejected with appropriate logging
  4. Malformed webhook payloads are rejected before reaching business logic
**Plans**: 2 plans

Plans:
- [ ] 02-01-PLAN.md - Zod schemas for Stripe events + timing-safe HMAC utility
- [ ] 02-02-PLAN.md - Integrate validation + idempotency + security tests

### Phase 3: API Security
**Goal**: External API calls handle authentication securely with proper error handling
**Depends on**: Phase 2 (webhook security must be complete before API security)
**Requirements**: SEC-02, SEC-04
**Success Criteria** (what must be TRUE):
  1. Tarabut API calls check token expiry and refresh tokens before requests
  2. Expired Tarabut tokens trigger automatic refresh flow
  3. Admin access is controlled via database table with audit logging
  4. Environment variable admin access is removed completely
  5. All admin operations are logged with user ID and timestamp
**Plans**: TBD

Plans:
- [ ] TBD after planning

### Phase 4: AI Security
**Goal**: Prompt injection detection is comprehensive and tested against known attack patterns
**Depends on**: Phase 3 (API security must be complete before AI security)
**Requirements**: SEC-05
**Success Criteria** (what must be TRUE):
  1. Prompt injection test suite covers all known attack patterns (jailbreaks, role confusion, context manipulation)
  2. High-risk prompts are blocked before reaching Claude API
  3. Medium-risk prompts are logged with security warnings
  4. Test suite includes examples from OWASP LLM Top 10
**Plans**: TBD

Plans:
- [ ] TBD after planning

### Phase 5: User-Facing Features
**Goal**: Users receive payment notifications and see accurate feature usage in their subscription dashboard
**Depends on**: Phase 4 (security must be complete before adding user-facing features)
**Requirements**: FEAT-01, FEAT-02, FEAT-03
**Success Criteria** (what must be TRUE):
  1. Users receive email notification 3 days before invoice due
  2. Users receive email notification when payment fails with retry instructions
  3. Subscription dashboard shows actual count of savings goals
  4. Subscription dashboard shows actual count of family members
  5. All "family" tier references are consolidated into Pro tier with code comments
  6. Family tier consolidation is documented in codebase
**Plans**: TBD

Plans:
- [ ] TBD after planning

### Phase 6: PWA Enhancement
**Goal**: Users know when they are viewing cached/stale data in offline mode
**Depends on**: Phase 5 (features must be complete before UX enhancements)
**Requirements**: FIX-03
**Success Criteria** (what must be TRUE):
  1. PWA displays indicator when showing cached data older than 5 minutes
  2. Indicator includes timestamp of last successful data fetch
  3. Users can manually trigger refresh when online
  4. Indicator is visually distinct but non-intrusive
**Plans**: TBD

Plans:
- [ ] TBD after planning

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Critical Infrastructure Fixes | 2/2 | Complete ✓ | 2026-01-25 |
| 2. Webhook Security | 0/2 | Planned | - |
| 3. API Security | 0/TBD | Not started | - |
| 4. AI Security | 0/TBD | Not started | - |
| 5. User-Facing Features | 0/TBD | Not started | - |
| 6. PWA Enhancement | 0/TBD | Not started | - |

---
*Roadmap created: 2026-01-25*
*Last updated: 2026-01-25 — Phase 2 planned*
