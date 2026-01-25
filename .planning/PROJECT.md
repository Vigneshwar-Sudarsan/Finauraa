# Finaura Stabilization

## What This Is

Finaura is a personal finance app for Saudi Arabia with AI-powered chat, bank account connections via Tarabut Open Banking, and subscription billing via Stripe. This milestone focuses on fixing critical bugs, security issues, and completing unfinished features to make the app production-ready.

## Core Value

Users can trust their financial data is handled securely and the app behaves correctly in all scenarios.

## Requirements

### Validated

- ✓ User authentication via Supabase (email/password, magic link) — existing
- ✓ AI chat with Claude for financial insights — existing
- ✓ Bank account connections via Tarabut Open Banking — existing
- ✓ Subscription management via Stripe (Pro, Family tiers) — existing
- ✓ PDPL-compliant consent management — existing
- ✓ Dashboard with accounts, transactions, budgets, goals — existing
- ✓ Family plan with member invitations — existing
- ✓ PWA with offline caching — existing
- ✓ Rate limiting on API endpoints — existing
- ✓ Prompt injection protection for AI chat — existing

### Active

**Bugs:**
- [ ] FIX-01: Rate limiter fails closed instead of open when DB unavailable
- [ ] FIX-02: Consent middleware handles all edge cases consistently
- [ ] FIX-03: PWA indicates when showing cached/stale data

**Security:**
- [ ] SEC-01: Webhook secrets use timing-safe comparison
- [ ] SEC-02: Tarabut tokens checked for expiry before API calls
- [ ] SEC-03: Stripe webhook payloads validated with Zod before type casting
- [ ] SEC-04: Admin access moved from env var to database with audit logging
- [ ] SEC-05: Prompt injection detection improved with test suite

**Incomplete Features:**
- [ ] FEAT-01: Payment email notifications implemented (upcoming invoice, failed payment)
- [ ] FEAT-02: Feature usage counters query actual data instead of hardcoded 0
- [ ] FEAT-03: Family tier consolidated into Pro with clear documentation

### Out of Scope

- Performance optimizations (finance manager queries) — deferred to next milestone
- Tech debt cleanup (type casting, singletons) — deferred to next milestone
- New features — this is a stabilization milestone only

## Context

**Existing Codebase:**
- Next.js 16 + React 19 full-stack app
- Supabase for database and auth
- Stripe for payments, Tarabut for bank connections
- Claude AI for financial insights
- PWA with offline support
- ~80% complete, needs stabilization

**Codebase Analysis:**
- `.planning/codebase/CONCERNS.md` documents all identified issues
- `.planning/codebase/ARCHITECTURE.md` describes system design
- `.planning/codebase/STACK.md` lists technologies

**Why This Matters:**
- Security issues could expose user financial data
- Bugs cause inconsistent user experience
- Incomplete features mislead users about capabilities

## Constraints

- **Testing**: All fixes must include tests (unit and/or integration)
- **Monitoring**: Critical paths must have logging for production debugging
- **Documentation**: Security changes must be documented
- **Backwards Compatible**: Fixes must not break existing functionality

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Critical fixes only | Focus on stability before features | — Pending |
| Bulletproof standard | Tests + monitoring + docs for each fix | — Pending |
| Defer performance work | Separate concern from correctness | — Pending |

---
*Last updated: 2026-01-25 after initialization*
