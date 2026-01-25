# External Integrations

**Analysis Date:** 2026-01-25

## APIs & External Services

**Open Banking:**
- Tarabut Gateway (https://tarabutgateway.io) - Open Banking API for Bahrain financial institutions
  - SDK/Client: Custom implementation in `lib/tarabut/client.ts`
  - Auth: OAuth2 with `TARABUT_CLIENT_ID`, `TARABUT_CLIENT_SECRET`
  - Endpoints: Token at `https://oauth.tarabutgateway.io/sandbox/token`, API at `https://api.sandbox.tarabutgateway.io`
  - Capabilities: Account information, balances, transactions, insights (income, balance history, spending), consent management, IBAN verification, transaction categorization
  - Used in: `app/api/tarabut/*` routes, `app/api/finance/*` routes

**Payment Processing:**
- Stripe - Payment processing and subscription management
  - SDK/Client: `stripe` npm package v20.2.0
  - Auth: API key via `STRIPE_SECRET_KEY`
  - Webhook validation: `STRIPE_WEBHOOK_SECRET`
  - Price IDs configured via env: Pro monthly/yearly, Family monthly/yearly
  - Webhook endpoint: `app/api/webhooks/stripe/route.ts`
  - Events handled: checkout.session.completed, customer.subscription.created/updated/deleted/paused/resumed, customer.subscription.trial_will_end, invoice.payment_succeeded/failed/upcoming, payment_intent.payment_failed
  - Used in: `app/api/subscription/*` routes, checkout flows, billing management

**AI & Language Model:**
- Anthropic Claude (https://api.anthropic.com) - AI-powered financial insights and chatbot
  - SDK/Client: `@anthropic-ai/sdk` v0.71.2
  - Auth: API key via `ANTHROPIC_API_KEY`
  - Model: claude-sonnet-4-20250514
  - Chat endpoint: `app/api/chat/route.ts`
  - Features: Privacy-first and enhanced AI modes with data anonymization options
  - Rate limiting: 30 requests per minute per user
  - Monthly limits: Free (10), Pro (100), Family (200) queries/month

**Email & Notifications:**
- Resend (https://resend.com) - Transactional email service
  - SDK/Client: `resend` npm package v6.8.0
  - Auth: API key via `RESEND_API_KEY`
  - Sender: Configured via `EMAIL_FROM` env var (default: "Finauraa <notifications@send.finauraa.com>")
  - Used in: `lib/email.ts` for transactional emails
  - Email types sent:
    - Consent expiry warnings (7 days before expiration)
    - Payment failure notifications
    - Trial ending soon notifications
    - Data export ready notifications
    - Family group invitations
    - Family member status changes (joined/removed)

## Data Storage

**Databases:**
- PostgreSQL via Supabase
  - Connection: `NEXT_PUBLIC_SUPABASE_URL` (public) and `SUPABASE_SERVICE_ROLE_KEY` (admin)
  - Client: `@supabase/supabase-js` v2.90.1 for client-side, `@supabase/ssr` v0.8.0 for server-side
  - Server client created in: `lib/supabase/server.ts`
  - Client created in: `lib/supabase/client.ts`
  - Tables: profiles, bank_connections, transactions, messages, user_consents, billing_history, family_groups, family_members, savings_goals, budgets, and more
  - RLS (Row-Level Security): Enforced for user data isolation
  - Admin access: Used in webhook handlers and sensitive operations via service role key

**File Storage:**
- Local filesystem with Next.js public directory (`public/`)
- No external cloud storage integration detected

**Caching:**
- None detected in production (relies on Supabase connection pooling)
- PWA offline cache via Workbox (browser-side)

## Authentication & Identity

**Auth Provider:**
- Supabase Auth - Built-in PostgreSQL-backed authentication
  - Implementation: `lib/supabase/server.ts` and `lib/supabase/client.ts`
  - Middleware: `middleware.ts` with session refresh via `lib/supabase/middleware.ts`
  - Methods: Email/password authentication (standard Supabase)
  - Session management: Cookie-based with Supabase SSR helper
  - Auth routes: `app/auth/callback/route.ts`, `app/auth/signout/route.ts`
  - Login/signup pages: `app/login/page.tsx`, `app/signup/page.tsx`

**Consent & Compliance:**
- Custom consent tracking for BOBF/PDPL compliance
  - Table: `user_consents`
  - Consent types: bank_access, ai_data_access
  - Data retention enforcement: `app/api/cron/data-retention/route.ts` (runs daily at 01:00 UTC)
  - Consent expiry: `app/api/cron/expire-consents/route.ts` (runs daily at 00:00 UTC)
  - Default retention: 30 days after consent revocation (configurable via `DATA_RETENTION_AFTER_REVOCATION_DAYS`)

## Monitoring & Observability

**Error Tracking:**
- Sentry (via @sentry/nextjs v10.35.0)
  - Configuration: Likely in `sentry.config.ts` or automatic Next.js integration
  - Captures: Exceptions, performance, and user errors

**Logs:**
- Console logging throughout codebase
- No external log aggregation detected (logs go to stdout for Vercel)

**Performance Monitoring:**
- PWA performance via Workbox runtime caching metrics

## CI/CD & Deployment

**Hosting:**
- Vercel (native Next.js platform)
  - Configuration: `vercel.json` specifies cron jobs

**CI Pipeline:**
- Vercel CI (automatic on Git push)
  - Build command: `npm run build`
  - Start command: `npm start`

**Cron Jobs (Vercel):**
- `/api/cron/expire-consents` - Daily at 00:00 UTC - Expires consents past their expiration date
- `/api/cron/data-retention` - Daily at 01:00 UTC - Deletes data for revoked consents per retention policy

## Environment Configuration

**Required env vars (from .env.example):**

**Tarabut Open Banking:**
- `TARABUT_CLIENT_ID` - OAuth client ID
- `TARABUT_CLIENT_SECRET` - OAuth client secret
- `TARABUT_REDIRECT_URI` - Callback URL after bank selection (e.g., https://www.finauraa.com/api/tarabut/callback)

**Supabase:**
- `NEXT_PUBLIC_SUPABASE_URL` - Database URL (public)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Anonymous key (public, safe in browser)
- `SUPABASE_SERVICE_ROLE_KEY` - Admin key (secret, server-only)

**Stripe:**
- `STRIPE_SECRET_KEY` - Secret API key (sk_test_* in test mode)
- `STRIPE_WEBHOOK_SECRET` - Webhook signing secret (whsec_*)
- `STRIPE_PRO_PRICE_ID_MONTHLY` - Pro plan monthly price ID
- `STRIPE_PRO_PRICE_ID_YEARLY` - Pro plan yearly price ID
- `STRIPE_FAMILY_PRICE_ID_MONTHLY` - Family plan monthly price ID
- `STRIPE_FAMILY_PRICE_ID_YEARLY` - Family plan yearly price ID

**Claude AI:**
- `ANTHROPIC_API_KEY` - Anthropic API key (sk_... format)

**Email (Resend):**
- `RESEND_API_KEY` - Resend API key (re_* format)
- `EMAIL_FROM` - Sender email address (e.g., "Finauraa <notifications@send.finauraa.com>")

**App Configuration:**
- `NEXT_PUBLIC_APP_URL` - Frontend URL (e.g., http://localhost:3000, https://www.finauraa.com)

**Feature Flags:**
- `USE_DYNAMIC_FEATURES` - Set to "true" for database-driven feature limits, "false" for static config
- `ADMIN_EMAILS` - Comma-separated list of admin email addresses for feature flag management

**Cron Jobs:**
- `CRON_SECRET` - Secure random string for cron job authentication (prevents unauthorized access to `/api/cron/*`)

**Compliance:**
- `DATA_RETENTION_AFTER_REVOCATION_DAYS` - Days to retain data after consent revocation (default: 30)

**Secrets location:**
- Development: `.env.local` file (git-ignored)
- Production: Vercel Environment Variables dashboard
- All secret keys should be stored as environment variables, never committed to git

## Webhooks & Callbacks

**Incoming:**
- Stripe webhooks: `app/api/webhooks/stripe/route.ts`
  - Events: subscription, invoice, payment intent status changes
  - Verification: Stripe signature validation with `STRIPE_WEBHOOK_SECRET`
  - Handler: Updates subscription status, billing history, sends notifications

- Tarabut callback: `app/api/tarabut/callback/route.ts`
  - After user completes consent in Tarabut's hosted UI
  - Updates bank connection status and bank details

**Outgoing:**
- Stripe: No direct webhook subscriptions from app (Stripe sends webhooks to us)
- Resend: Email sending is one-way (no callbacks expected)
- Tarabut: OAuth redirect only (user browser redirected back to app)

---

*Integration audit: 2026-01-25*
