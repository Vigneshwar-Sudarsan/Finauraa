# External Integrations

**Analysis Date:** 2026-01-25

## APIs & External Services

**Open Banking & Financial Data:**
- Tarabut Gateway (Open Banking) - Multi-bank account aggregation via PSD2/Open Banking
  - SDK/Client: Custom client at `lib/tarabut/client.ts` (not npm package)
  - Auth: `TARABUT_CLIENT_ID`, `TARABUT_CLIENT_SECRET`, `TARABUT_REDIRECT_URI`
  - Endpoints: OAuth token at `https://oauth.tarabutgateway.io/sandbox/token`, API at `https://api.sandbox.tarabutgateway.io`
  - Key Features:
    - Account information service (AIS): Fetch accounts, balances, transactions
    - Consent management: Intent creation, revocation, expiry tracking
    - Insights API: Income summary, salary detection, balance history, spending categorization
    - Transaction enrichment: Categories, merchant data, spending patterns
  - Implementation: `lib/tarabut/client.ts` (TarabutClient class with 40+ methods)
  - Usage: Bank connection workflows in `app/api/finance/connections/*`, cron sync in `app/api/cron/sync-banks`

**Payment Processing:**
- Stripe - Subscription payments, billing, invoicing
  - SDK/Client: `stripe` npm package v20.2.0
  - Auth: `STRIPE_SECRET_KEY` (server-side only), `STRIPE_WEBHOOK_SECRET`
  - Public API Key: `NEXT_PUBLIC_STRIPE_*` (not used in current setup)
  - Endpoints: Stripe API v2025-12-15.clover
  - Key Features:
    - Subscription management (Pro plan, Family plan with monthly/yearly)
    - Customer portal for self-service billing
    - Webhook events: `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
    - Checkout sessions with redirect flow
  - Implementation:
    - Client initialization in `app/api/subscription/route.ts`, `app/api/webhooks/stripe/route.ts`
    - Lazy initialization pattern (only when needed)
  - Webhook handler: `app/api/webhooks/stripe/route.ts` (signature verification + event processing)
  - Price IDs configured:
    - Pro: `STRIPE_PRO_PRICE_ID_MONTHLY`, `STRIPE_PRO_PRICE_ID_YEARLY`
    - Family: `STRIPE_FAMILY_PRICE_ID_MONTHLY`, `STRIPE_FAMILY_PRICE_ID_YEARLY`

**AI & LLM:**
- Anthropic Claude - Financial AI assistant and insights
  - SDK/Client: `@anthropic-ai/sdk` v0.71.2
  - Auth: `ANTHROPIC_API_KEY` (server-side only)
  - Implementation: `app/api/chat/route.ts` (Anthropic class initialized with API key)
  - Key Features:
    - Multi-turn conversations for financial advice
    - Context-aware responses using user's financial data
    - Privacy modes: "privacy-first" (anonymized) or "enhanced" (full data)
    - Rate limiting per subscription tier
  - Integration with finance manager: `lib/ai/finance-manager.ts` provides comprehensive financial context
  - Data privacy: `lib/ai/data-privacy.ts` handles anonymization and consent

**Email Service:**
- Resend - Transactional emails
  - SDK/Client: `resend` npm package v6.8.0
  - Auth: `RESEND_API_KEY`
  - Email Sender: `EMAIL_FROM` (default: "Finauraa <notifications@send.finauraa.com>")
  - Implementation: `lib/email.ts` (lazy-initialized Resend client)
  - Transactional Emails Sent:
    - Consent expiry warnings (7 days before expiration)
    - Payment failed notifications
    - Trial ending reminders
    - Data export ready notifications
    - Family group invitations
    - Member joined/removed notifications

## Data Storage

**Databases:**
- Supabase PostgreSQL - Primary relational database
  - Connection: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (public), `SUPABASE_SERVICE_ROLE_KEY` (admin)
  - Client Libraries:
    - `@supabase/supabase-js` 2.90.1 - Core client (browser + Node.js)
    - `@supabase/ssr` 0.8.0 - Server-side rendering optimized client
  - Key Tables (inferred from code):
    - `profiles` - User profiles with family_group_id
    - `bank_connections` - Bank connection status tracking
    - `bank_accounts` - Connected bank accounts (balance, currency, account_type)
    - `transactions` - Individual transactions with merchant data, category, type
    - `budgets` - User-created budgets with category and amount
    - `savings_goals` - Personal savings goals with target tracking
    - `family_groups` - Family group management
    - `family_goal_members` - Family goal assignments
  - Real-time subscriptions: Supported via Supabase RealtimeClient
  - Row-level security (RLS): Enforced for multi-tenant data isolation
  - Implementation:
    - Browser client: `lib/supabase/client.ts` (createBrowserClient)
    - Server client: `lib/supabase/server.ts` (createServerClient with cookie handling)
    - Admin client: `lib/supabase/server.ts` (createAdminClient for service operations)

**File Storage:**
- Supabase Storage or Local filesystem (not explicitly configured)
- Data exports likely generated as files for email delivery

**Caching:**
- SWR (Stale-While-Revalidate) - Client-side data fetching cache
- Zustand - Client-side state persistence

## Authentication & Identity

**Auth Provider:**
- Supabase Auth - Custom authentication via PostgreSQL
  - Implementation: Built into Supabase client
  - Session management: Cookie-based with automatic refresh
  - JWT tokens: Managed by Supabase
  - User context available via `supabase.auth.getUser()`

**Middleware:**
- `middleware.ts` - Custom Next.js middleware for session/auth handling
- `lib/consent-middleware.ts` - PDPL consent validation middleware

## Monitoring & Observability

**Error Tracking:**
- Sentry - Error tracking and performance monitoring
  - SDK: `@sentry/nextjs` v10.35.0
  - Configured for Next.js (captures errors, performance metrics, session replays)

**Logs:**
- Console logging (console.log, console.error)
- Security event logging: `lib/audit.ts` (logSecurityEvent, logPaymentEvent functions)
- Audit trails for:
  - Payment events (subscription changes)
  - Bank connection changes
  - Consent management events

## CI/CD & Deployment

**Hosting:**
- Vercel - Serverless platform for Next.js deployment
  - Automatic builds on git push
  - Environment variables managed in Vercel dashboard
  - Preview deployments for branches

**CI Pipeline:**
- ESLint (no automated testing detected)
- Next.js build (`next build --webpack`)

**Cron Jobs:**
- Vercel Cron (defined in `vercel.json`)
  - Expire consents check: Daily 00:00 UTC
  - Data retention cleanup: Daily 01:00 UTC
  - Bank data sync from Tarabut: Daily 06:00 UTC
  - Auth: `CRON_SECRET` header validation

## Environment Configuration

**Required env vars:**

**Tarabut (Open Banking):**
- `TARABUT_CLIENT_ID` - OAuth client identifier
- `TARABUT_CLIENT_SECRET` - OAuth client secret
- `TARABUT_REDIRECT_URI` - Callback URL after bank connection

**Supabase:**
- `NEXT_PUBLIC_SUPABASE_URL` - Database/auth URL (public)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Anon API key (public)
- `SUPABASE_SERVICE_ROLE_KEY` - Admin API key (secret, server-only)

**Anthropic:**
- `ANTHROPIC_API_KEY` - Claude API access

**Stripe:**
- `STRIPE_SECRET_KEY` - API secret key (server-only)
- `STRIPE_WEBHOOK_SECRET` - Webhook signature secret
- `STRIPE_PRO_PRICE_ID_MONTHLY` - Monthly subscription price ID
- `STRIPE_PRO_PRICE_ID_YEARLY` - Yearly subscription price ID
- `STRIPE_FAMILY_PRICE_ID_MONTHLY` - Family plan monthly price ID
- `STRIPE_FAMILY_PRICE_ID_YEARLY` - Family plan yearly price ID

**Resend (Email):**
- `RESEND_API_KEY` - Email service API key
- `EMAIL_FROM` - Sender email address

**Feature Flags:**
- `USE_DYNAMIC_FEATURES` - Use database-driven feature limits ("true" or "false")
- `ADMIN_EMAILS` - Comma-separated admin email list for feature flag management

**App Configuration:**
- `NEXT_PUBLIC_APP_URL` - Application URL (for Stripe redirects, email links)
- `CRON_SECRET` - Secure token for cron job endpoints
- `DATA_RETENTION_AFTER_REVOCATION_DAYS` - PDPL compliance retention period (default: 30)

**Secrets location:**
- Development: `.env.local` (not committed)
- Production: Vercel Environment Variables dashboard
- Reference: `.env.example` in repository root

## Webhooks & Callbacks

**Incoming:**
- **Stripe Webhooks:** `app/api/webhooks/stripe/route.ts`
  - Path: `/api/webhooks/stripe`
  - Events:
    - `customer.subscription.updated`
    - `customer.subscription.deleted`
    - `invoice.payment_failed`
    - `customer.subscription.trial_will_end`
  - Validation: Signature verification with `STRIPE_WEBHOOK_SECRET`
  - Actions: Update subscription status, send payment notifications, trigger trial ending emails

- **Tarabut Callback:** `app/api/tarabut/callback` (referenced in `.env.example`)
  - Path: `/api/tarabut/callback`
  - Purpose: Handle bank connection completion after user consent
  - Flow: User selects bank → Tarabut Connect → redirect to callback → store connection

**Outgoing:**
- **Email Notifications:** Sent via Resend to user email addresses
- **Sentry:** Error events sent to error tracking service
- **Data Export Downloads:** Generated files with signed URLs for user downloads

---

*Integration audit: 2026-01-25*
