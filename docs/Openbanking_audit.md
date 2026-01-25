# Claude Code Prompt: Bahrain Open Banking Compliance Audit & Implementation

## Context

**Finauraa** (https://www.finauraa.com) is a personal finance management app for Bahrain using **Tarabut Gateway Open Banking API**. The app fetches account information and transactions from users' bank accounts, provides AI-powered insights (via Claude API), and offers subscription plans (Free, Pro, Family) via Stripe.

I need to audit my codebase and database structure to ensure it's compliant with:

- **Bahrain Open Banking Framework (BOBF)**
- **Bahrain Personal Data Protection Law (PDPL)**
- **CBB (Central Bank of Bahrain) Rulebook requirements**

Even though I'm currently in sandbox mode, I want to build the app as production-ready from day one.

## Current Status

- **Production URL**: https://www.finauraa.com
- **Hosting**: Vercel
- **Stripe Webhook**: https://www.finauraa.com/api/webhooks/stripe
- **Tarabut Callback**: https://www.finauraa.com/api/tarabut/callback
- **Environment**: Sandbox (Tarabut) / Live (Stripe)

---

## Your Tasks

### 1. Database Schema Audit & Enhancement

Review and update my database schema (Supabase/PostgreSQL) to include:

#### A. User Consent Management
```sql
-- Required fields for consent tracking:
-- - consent_id (unique identifier)
-- - user_id (reference to user)
-- - provider_id (bank/ASPSP identifier)
-- - consent_type (AIS, PIS, or both)
-- - permissions_granted (array of specific permissions: ReadAccountsBasic, ReadAccountsDetail, ReadBalances, ReadTransactionsBasic, ReadTransactionsDetail, etc.)
-- - purpose (clear description of why data is being accessed)
-- - consent_given_at (timestamp)
-- - consent_expires_at (timestamp - must have expiry)
-- - consent_status (active, revoked, expired)
-- - revoked_at (timestamp, nullable)
-- - revocation_reason (nullable)
-- - ip_address (where consent was given)
-- - user_agent (device/browser info)
-- - consent_version (for tracking T&C versions)
```

#### B. Account Information Storage
```sql
-- Accounts table must include:
-- - Soft delete capability (don't hard delete, mark as deleted for audit)
-- - Link to active consent (data invalid if consent revoked)
-- - Data refresh timestamp
-- - Data retention expiry (auto-cleanup trigger)
```

#### C. Transaction Storage
```sql
-- Transactions table must include:
-- - Link to consent that authorized this data
-- - Fetched_at timestamp
-- - Retention policy fields
-- - Anonymization flag for post-consent retention
```

#### D. Audit Logging
```sql
-- Create comprehensive audit_logs table:
-- - log_id
-- - user_id
-- - action_type (data_access, data_fetch, consent_given, consent_revoked, data_deleted, data_exported, login, etc.)
-- - resource_type (account, transaction, balance, consent)
-- - resource_id
-- - action_timestamp
-- - ip_address
-- - user_agent
-- - request_details (JSON - API endpoint, parameters)
-- - response_status
-- - performed_by (user or system)
```

#### E. Data Retention Configuration
```sql
-- Create data_retention_policies table:
-- - policy_id
-- - data_type (accounts, transactions, consents, audit_logs)
-- - retention_period_days
-- - post_revocation_retention_days (for legal/audit requirements)
-- - anonymization_required (boolean)
-- - created_at
-- - updated_at
```

### 2. API & Backend Code Audit

Review my backend code and implement/update:

#### A. Consent Middleware
- Create middleware that checks consent validity before ANY data access
- Reject requests if consent is expired, revoked, or missing required permissions
- Log all access attempts (successful and failed)

#### B. Data Access Layer
```typescript
// Every data fetch must:
// 1. Verify active consent exists
// 2. Check consent has required permissions
// 3. Check consent is not expired
// 4. Log the access in audit_logs
// 5. Return only data within consent scope
```

#### C. Consent Management Endpoints
Ensure these endpoints exist and are properly implemented:
- `POST /consents` - Create new consent (with proper validation)
- `GET /consents` - List user's active consents
- `GET /consents/:id` - Get specific consent details
- `DELETE /consents/:id` - Revoke consent (triggers data handling workflow)
- `GET /consents/:id/permissions` - View what permissions were granted

#### D. Data Deletion Workflow
When consent is revoked, implement:
```typescript
// 1. Mark consent as revoked with timestamp
// 2. Trigger data cleanup job:
//    - Mark associated accounts as inactive
//    - Mark transactions as pending_deletion
//    - Keep anonymized/aggregated data if needed for your service
//    - Schedule hard deletion after legal retention period
// 3. Log all deletion actions
// 4. Notify user of data deletion completion
```

#### E. Data Export (PDPL Right to Portability)
```typescript
// Implement user data export endpoint:
// GET /users/:id/data-export
// - Export all user data in machine-readable format (JSON)
// - Include: accounts, transactions, consents, audit logs
// - Log the export request
```

### 3. Frontend/UI Audit

Review and implement:

#### A. Consent Capture Screen
- Clear explanation of what data will be accessed
- Specific permissions being requested (not bundled)
- Purpose of data access in plain language
- Consent duration/expiry clearly stated
- Easy-to-read format (not hidden in T&C)
- Checkbox must not be pre-checked
- Store consent proof (timestamp, IP, device)

#### B. Consent Management Dashboard
Users must be able to:
- View all active consents
- See what data each consent allows access to
- See when each consent expires
- Revoke any consent with one click
- View history of revoked consents

#### C. Data Visibility
- Show users when their data was last refreshed
- Show which bank accounts are connected
- Allow users to request data deletion

### 4. Background Jobs & Automation

Implement these scheduled jobs:

#### A. Consent Expiry Handler
```typescript
// Run daily:
// 1. Find consents expiring in next 7 days → notify users
// 2. Find expired consents → mark as expired, trigger data cleanup
```

#### B. Data Retention Cleanup
```typescript
// Run daily:
// 1. Find data past retention period
// 2. Anonymize or delete based on policy
// 3. Log all cleanup actions
```

#### C. Audit Log Archival
```typescript
// Run monthly:
// 1. Archive audit logs older than X days
// 2. Keep archived logs for regulatory period (typically 5-7 years)
```

### 5. Security Enhancements

Verify and implement:

- [ ] All PII encrypted at rest (Supabase has this, verify it's enabled)
- [ ] All API calls over HTTPS
- [ ] API authentication on all endpoints
- [ ] Rate limiting on sensitive endpoints
- [ ] Input validation on all user inputs
- [ ] SQL injection protection (parameterized queries)
- [ ] Sensitive data not logged in plain text
- [ ] Session management with proper expiry

### 6. Environment & Configuration

**Already configured in .env:**

```env
# Tarabut Gateway (Open Banking)
TARABUT_CLIENT_ID=your-tarabut-client-id
TARABUT_CLIENT_SECRET=your-tarabut-client-secret
TARABUT_REDIRECT_URI=https://www.finauraa.com/api/tarabut/callback

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Anthropic (Claude AI)
ANTHROPIC_API_KEY=your-anthropic-api-key

# Stripe Payment Integration
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRO_PRICE_ID_MONTHLY=price_xxx
STRIPE_PRO_PRICE_ID_YEARLY=price_xxx
STRIPE_FAMILY_PRICE_ID_MONTHLY=price_xxx
STRIPE_FAMILY_PRICE_ID_YEARLY=price_xxx

# App Configuration
NEXT_PUBLIC_APP_URL=https://www.finauraa.com
USE_DYNAMIC_FEATURES=true
ADMIN_EMAILS=admin@finauraa.com
```

**To be added for compliance:**

```env
# Data Retention Settings (PDPL Compliance)
CONSENT_DEFAULT_EXPIRY_DAYS=90
DATA_RETENTION_AFTER_REVOCATION_DAYS=30
AUDIT_LOG_RETENTION_YEARS=7
TRANSACTION_RETENTION_DAYS=365

# Tarabut Gateway Environment
TARABUT_API_URL=https://sandbox.tarabut.com  # Change to production URL when ready

# Feature Flags for Compliance
ENABLE_AUDIT_LOGGING=true
ENABLE_AUTO_CLEANUP=true
ENABLE_CONSENT_EXPIRY_NOTIFICATIONS=true
```

---

## Deliverables

After your audit, provide:

1. **Database Migration Files** - SQL migrations for all schema changes
2. **Updated/New Code Files** - With compliance features implemented
3. **Checklist** - What was found and what was fixed
4. **Remaining TODOs** - Anything that needs manual review or decision

---

## Important Notes

- **Don't break existing functionality** - Add compliance features alongside existing code
- **Use soft deletes** - Never hard delete user data without proper workflow
- **Log everything** - When in doubt, log it
- **Consent is king** - No data access without valid consent check
- **Keep it flexible** - Regulations may change, make policies configurable

---

## Tech Stack Reference

- **Framework**: Next.js 16.1.3 (App Router with API Routes)
- **Frontend**: React 19.2.3 + TypeScript 5
- **Styling**: Tailwind CSS 4 + shadcn/ui + Radix UI 1.4.3
- **Database**: Supabase (PostgreSQL with RLS) - 21 tables
- **Authentication**: Supabase Auth
- **AI**: Anthropic Claude API (@anthropic-ai/sdk v0.71.2)
- **Payments**: Stripe v20.2.0 (subscriptions, webhooks)
- **Rate Limiting**: Supabase (database-based via `rate_limits` table)
- **State Management**: Zustand v5.0.10
- **Error Tracking**: Sentry v10.35.0
- **Hosting**: Vercel (with cron jobs)
- **PWA**: @ducanh2912/next-pwa v10.2.9 (Progressive Web App support)
- **Open Banking API**: Tarabut Gateway
- **Email**: Resend v6.8.0 (transactional emails)
- **Date Handling**: date-fns v4.1.0

---

## Start Here

1. First, explore my codebase structure
2. Identify existing database schema
3. List what's already implemented vs. what's missing
4. Propose changes before implementing
5. Implement in order: Database → Backend → Frontend → Jobs

---

## Implementation Status (January 2026)

### ✅ Completed

#### Database Schema (Migration: `20250122_compliance_bobf_pdpl.sql`)

| Table | Status | Description |
|-------|--------|-------------|
| `user_consents` | ✅ Created | Full consent lifecycle tracking with permissions, expiry, audit trail |
| `audit_logs` | ✅ Created | Comprehensive audit logging for all data access |
| `data_retention_policies` | ✅ Created | Configurable retention rules with default policies |
| `billing_history` | ✅ Created | Payment records from Stripe with full invoice details |
| `data_export_requests` | ✅ Created | PDPL data portability request tracking |
| `data_deletion_requests` | ✅ Created | PDPL right to erasure request tracking |

**Schema Modifications:**
- ✅ Added `deleted_at`, `deleted_by` to `bank_connections`, `bank_accounts`, `transactions`
- ✅ Added `retention_expires_at`, `is_anonymized`, `consent_id` to `transactions`
- ✅ Added subscription fields to `profiles` (stripe_customer_id, subscription_tier, etc.)

**Database Functions:**
- ✅ `has_active_consent()` - Check consent validity
- ✅ `log_audit_event()` - Helper for audit logging
- ✅ `expire_consents()` - Mark expired consents (for cron job)

#### API Endpoints

| Endpoint | Method | Status | Description |
|----------|--------|--------|-------------|
| `/api/consents` | GET | ✅ | List user's consents with filtering |
| `/api/consents` | POST | ✅ | Create new consent with audit trail |
| `/api/consents/[id]` | GET | ✅ | Get specific consent details |
| `/api/consents/[id]` | DELETE | ✅ | Revoke consent + trigger data cleanup |
| `/api/user/data-export` | GET | ✅ | List export request history |
| `/api/user/data-export` | POST | ✅ | Request full data export (PDPL) |

#### Backend Utilities

| File | Status | Description |
|------|--------|-------------|
| `lib/audit.ts` | ✅ Created | Audit logging utility with typed events |
| `lib/consent-middleware.ts` | ✅ Created | Consent verification middleware for finance routes |
| Stripe webhook | ✅ Updated | Uses `billing_history` table + audit logging |

#### Consent Middleware Integration

All `/api/finance/*` routes now verify active `bank_access` consent before data access:

| Route | Status | Notes |
|-------|--------|-------|
| `/api/finance/accounts` | ✅ | Consent check + audit logging |
| `/api/finance/accounts/[id]` | ✅ | Consent check |
| `/api/finance/transactions` | ✅ | Consent check + audit logging |
| `/api/finance/transactions/manual` | ✅ | Consent check |
| `/api/finance/summary` | ✅ | Consent check |
| `/api/finance/spending` | ✅ | Consent check |
| `/api/finance/connections` | ✅ | Consent check |
| `/api/finance/connections/[id]` | ✅ | Consent check + disconnect audit logging |
| `/api/finance/connections/disconnect-all` | ✅ | Audit logging for bulk disconnect |
| `/api/finance/refresh` | ✅ | Consent check + sync audit logging |
| `/api/finance/budgets` | ✅ | Consent check |
| `/api/finance/savings-goals` | ✅ | Consent check |
| `/api/finance/savings-goals/[id]` | ✅ | Consent check |
| `/api/finance/insights/balance-history` | ✅ | Consent check |
| `/api/finance/insights/income` | ✅ | Consent check |
| `/api/finance/insights/spending` | ✅ | Consent check |
| `/api/finance/insights/salary` | ✅ | Consent check |

#### Cron Jobs (Vercel Cron)

| Route | Schedule | Status | Description |
|-------|----------|--------|-------------|
| `/api/cron/expire-consents` | Daily 00:00 UTC | ✅ | Marks expired consents, sends expiry warning emails |
| `/api/cron/data-retention` | Daily 01:00 UTC | ✅ | Processes deletions, anonymizes data, cleanup |

#### Email Notifications (Resend)

| Notification Type | Trigger | Status | Description |
|-------------------|---------|--------|-------------|
| Consent Expiry Warning | 7 days before expiry | ✅ | Reminds user to renew consent |
| Payment Failed | Stripe webhook | ✅ | Alerts user to update payment method |
| Trial Ending Soon | Stripe webhook | ✅ | Reminds user to upgrade before trial ends |
| Data Export Ready | Export completion | ✅ | Provides download link for data export |

#### Frontend (Privacy & Data UI)

| Component/Page | Status | Description |
|----------------|--------|-------------|
| `/dashboard/settings/privacy` | ✅ | Privacy & Data management page |
| `privacy-content.tsx` | ✅ | Full consent management UI |
| Settings page privacy link | ✅ | Added to main settings |

### ✅ All Core TODOs Completed

#### Frontend
- [x] Consent capture screen improvements (show permissions explicitly during bank connection) ✅ (`BankConsentDialog` component)

#### Security
- [x] Verify Supabase encryption at rest is enabled ✅ (Enabled by default on all Supabase projects)
- [x] Add rate limiting to consent endpoints ✅ (`lib/ratelimit.ts` - uses Supabase)
- [x] Add input validation schemas (Zod) ✅ (`lib/validations/consent.ts`)
- [x] Fix RLS policies on `data_retention_policies` ✅ (Migration applied)
- [x] Fix function search_path vulnerabilities ✅ (8 functions fixed)
- [x] Fix overly permissive RLS on `audit_logs` and `billing_history` ✅ (Migration applied)

#### Optional Enhancements
- [ ] Enable leaked password protection (Requires Supabase Pro plan)
- [ ] Add WebAuthn/passkey support for passwordless auth

---

## Files Created/Modified

### New Files
```
supabase/migrations/20250122_compliance_bobf_pdpl.sql  # Database migration
lib/audit.ts                                            # Audit logging utility
lib/consent-middleware.ts                               # Consent verification middleware
lib/email.ts                                            # Email notification service (Resend)
lib/ratelimit.ts                                        # Rate limiting utility (uses Supabase)
lib/validations/consent.ts                             # Zod validation schemas for consent endpoints
app/api/consents/route.ts                              # Consent list/create (+ rate limiting + validation)
app/api/consents/[id]/route.ts                         # Consent get/revoke (+ rate limiting)
app/api/user/data-export/route.ts                      # Data export API (+ rate limiting + validation)
app/api/cron/expire-consents/route.ts                  # Cron: expire consents + email notifications
app/api/cron/data-retention/route.ts                   # Cron: data retention cleanup
components/dashboard/privacy-content.tsx               # Privacy & Data UI component
components/dashboard/bank-consent-dialog.tsx           # Bank connection consent dialog (BOBF/PDPL)
app/dashboard/settings/privacy/page.tsx                # Privacy settings page
vercel.json                                            # Vercel cron configuration
```

### Modified Files
```
app/api/webhooks/stripe/route.ts                       # Audit logging + billing_history + lazy init
app/api/subscription/checkout/route.ts                # Lazy Stripe initialization
app/api/subscription/portal/route.ts                  # Lazy Stripe initialization
app/api/subscription/cancel/route.ts                  # Lazy Stripe initialization
app/api/subscription/change-billing/route.ts          # Lazy Stripe initialization
app/api/subscription/change-plan/route.ts             # Lazy Stripe initialization
app/api/subscription/sync/route.ts                    # Lazy Stripe initialization
app/api/finance/accounts/route.ts                      # Added consent middleware
app/api/finance/accounts/[id]/route.ts                 # Added consent middleware
app/api/finance/transactions/route.ts                  # Added consent middleware
app/api/finance/transactions/manual/route.ts          # Added consent middleware
app/api/finance/summary/route.ts                       # Added consent middleware
app/api/finance/spending/route.ts                      # Added consent middleware
app/api/finance/connections/route.ts                   # Added consent middleware
app/api/finance/connections/[id]/route.ts              # Added consent middleware + audit
app/api/finance/connections/disconnect-all/route.ts   # Added audit logging
app/api/finance/refresh/route.ts                       # Added consent middleware + audit
app/api/finance/budgets/route.ts                       # Added consent middleware
app/api/finance/savings-goals/route.ts                 # Added consent middleware
app/api/finance/savings-goals/[id]/route.ts            # Added consent middleware
app/api/finance/insights/balance-history/route.ts     # Added consent middleware
app/api/finance/insights/income/route.ts              # Added consent middleware
app/api/finance/insights/spending/route.ts            # Added consent middleware
app/api/finance/insights/salary/route.ts              # Added consent middleware
components/dashboard/settings-content.tsx              # Added Privacy & Data link
app/dashboard/settings/connected-banks/page.tsx       # Added consent dialog before bank connection
.env.example                                           # Updated for compliance
```

---

## How to Apply Migration

1. Go to Supabase Dashboard → SQL Editor
2. Open `supabase/migrations/20250122_compliance_bobf_pdpl.sql`
3. Run the entire migration
4. Verify with:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('user_consents', 'audit_logs', 'data_retention_policies', 'billing_history', 'data_export_requests', 'data_deletion_requests');
```

---

## Environment Variables to Add

Add these to Vercel Environment Variables:

```env
# Compliance Settings
ENABLE_AUDIT_LOGGING=true
CONSENT_DEFAULT_EXPIRY_DAYS=90
DATA_RETENTION_AFTER_REVOCATION_DAYS=30

# Cron Job Security
# Generate with: openssl rand -base64 32
CRON_SECRET=your-secure-cron-secret-here

# Email Notifications (Resend)
RESEND_API_KEY=re_xxxxxxxxxxxxx
EMAIL_FROM=Finauraa <notifications@send.finauraa.com>
```

**Setup Notes:**
- `CRON_SECRET` - Used to secure cron endpoints. Generate with: `openssl rand -base64 32`
- `RESEND_API_KEY` - Get from [resend.com](https://resend.com). Required for email notifications.
- `EMAIL_FROM` - Must be a verified domain in Resend, or use `onboarding@resend.dev` for testing.
- Rate limiting uses your existing Supabase database (no additional services needed).