# Architecture

**Analysis Date:** 2026-01-25

## Pattern Overview

**Overall:** Layered Next.js 16 full-stack architecture with React 19 frontend and Node.js backend, organized around financial data processing and AI-powered chat interface.

**Key Characteristics:**
- API-first design: Client communicates exclusively through REST API routes (`/app/api`)
- Server-side data fetching: All financial data aggregation happens in API layer, never exposed to client
- React context + Zustand state management for UI state (filters, dialogs, etc.)
- Supabase as primary data layer with RLS policies for multi-user safety
- Anthropic Claude integration for AI chat with context-aware prompts
- Consent-first architecture: All data access requires PDPL/BOBF consent verification

## Layers

**Presentation (Frontend):**
- Purpose: React components rendering UI, handling user interactions, managing local state
- Location: `components/`, `app/` (pages and layouts), `hooks/`
- Contains: React components (TSX), custom hooks, providers
- Depends on: API routes via `useApiCall` hook, Zustand stores, React context
- Used by: Browser client

**API Gateway (Backend Routes):**
- Purpose: Request routing, authentication, validation, consent middleware, data transformation
- Location: `app/api/` directory structure mirrors domain (chat, finance, family, etc.)
- Contains: Next.js route handlers exporting GET/POST/PUT/DELETE/PATCH functions
- Depends on: Supabase client, middleware utilities, business logic libraries
- Used by: Frontend components via fetch calls

**Business Logic (Domain Services):**
- Purpose: Complex financial calculations, AI context building, data validation
- Location: `lib/ai/`, `lib/supabase/`, `lib/validations/`, utility modules
- Contains: Finance manager calculations, privacy handlers, data transformers
- Depends on: Supabase client, type definitions
- Used by: API routes for core processing

**Data Access (Supabase):**
- Purpose: PostgreSQL database with RLS, real-time subscriptions, auth
- Location: Remote (Supabase), local migrations in `supabase/migrations/`
- Contains: User authentication, financial data, relationships, audit logs
- Depends on: Database schema, RLS policies
- Used by: All API routes via Supabase client

**External Services:**
- AI Model: Anthropic Claude for chat responses
- Bank Integration: Tarabut API for bank account connections
- Email: Resend for transactional emails
- Payments: Stripe for subscription management
- Error Tracking: Sentry for production monitoring

## Data Flow

**Chat Message Flow:**

1. User types message in chat input (`components/chat/chat-input.tsx`)
2. Client sends POST to `/api/chat` with conversation ID and message history
3. API handler (`app/api/chat/route.ts`):
   - Authenticates user via Supabase
   - Checks rate limits (30 req/min) and monthly query limits (tier-based)
   - Fetches user's financial context (via `lib/ai/finance-manager.ts`)
   - Sanitizes user input to prevent prompt injection
   - Sends to Claude with system prompt containing user's financial data
   - Returns JSON response with message text and rich content components
4. Frontend renders message and any rich content cards
5. Chat state persists: messages saved to `conversations` and `messages` tables

**Financial Data Fetch Flow:**

1. Component needs account data (e.g., `components/dashboard/accounts-content.tsx`)
2. Uses `useApiCall` hook or direct fetch to GET `/api/finance/accounts`
3. API handler (`app/api/finance/accounts/route.ts`):
   - Verifies user is authenticated
   - Checks `requireBankConsent()` middleware for PDPL compliance
   - Returns empty data if user has no bank connections
   - Queries `bank_accounts` table joined with `bank_connections`
   - Transforms flat database records into typed response
4. Frontend caches response via SWR
5. If user needs data refreshed, calls `/api/finance/refresh` endpoint

**Consent-Protected Data Access:**

1. API route calls `requireBankConsent(supabase, user.id)`
2. Middleware checks `user_consents` table for active `bank_access` consent
3. If no consent: returns 403 with redirect to consent flow
4. If expired: returns 403 with renewal message
5. If valid: allows request to proceed, logs access for audit trail

**State Management:**

- **UI State (Zustand):** Filter preferences (`lib/stores/transaction-filter-store.ts`), dialog open/close
- **Server State (SWR):** Financial data cached with 5-second dedup window, revalidates on stale
- **Auth State (Supabase):** Managed via middleware, accessed via `createClient()` hook
- **Real-time:** Not currently used; data is polled/refetched on demand

## Key Abstractions

**useApiCall Hook:**
- Purpose: Standardized async request handling with loading/error/data states
- Examples: `hooks/use-api-call.ts`, `hooks/use-transactions.ts`, `hooks/use-spending.ts`
- Pattern: Returns `{ execute, loading, error, data, reset }` object; supports transform functions for request/response

**Consent Middleware:**
- Purpose: Ensure all financial data access is PDPL-compliant
- Examples: `lib/consent-middleware.ts` with `requireBankConsent()` and `requireDataSharingConsent()`
- Pattern: Called first in API route, returns result object with detailed error codes

**Finance Manager Context:**
- Purpose: Aggregate user's financial data into structured format for AI
- Examples: `lib/ai/finance-manager.ts` exports `getFinanceManagerContext()`, `formatFinanceManagerContext()`
- Pattern: Fetches raw data from multiple tables, calculates insights (spending patterns, budget warnings), returns typed `FinanceManagerContext` object

**Message Content Types:**
- Purpose: Extensible system for AI to include interactive UI components in chat
- Examples: `balance-card`, `spending-analysis`, `action-buttons`, `savings-goals`
- Pattern: API returns `richContent` array of objects with `type` and optional `data`; frontend renders via `RichContent` component with switch statement

**Transaction Filter Store:**
- Purpose: Preserve filter state across navigation without re-fetching
- Examples: `lib/stores/transaction-filter-store.ts` using Zustand
- Pattern: Centralized store with `setFilters()`, `updateFilter()`, `consumePendingFilter()` actions

## Entry Points

**Public Home/Chat:**
- Location: `app/page.tsx`
- Triggers: User visits `/`
- Responsibilities: Renders chat interface with conversation history sidebar, manages initial bank connection prompt

**Dashboard:**
- Location: `app/dashboard/page.tsx`
- Triggers: User visits `/dashboard`
- Responsibilities: Navigation hub for viewing accounts, transactions, budgets, goals

**Authentication Pages:**
- Location: `app/login/`, `app/signup/`, `app/forgot-password/`, `app/reset-password/`
- Triggers: User navigates to auth routes
- Responsibilities: Form handling via Supabase auth

**API Routes (All):**
- Location: `app/api/**/*.ts` route.ts files
- Triggers: Client-side fetch calls
- Responsibilities: Request validation, auth checks, consent verification, data transformation

## Error Handling

**Strategy:** Graceful degradation with detailed client-facing error messages; sensitive errors logged server-side.

**Patterns:**

1. **API Errors:**
   - 401: Unauthorized (user not authenticated) - redirects to login
   - 403: Forbidden (consent missing/expired/revoked) - shows consent prompt
   - 400: Bad request (validation failure) - returns `{ error: "...", details: [...] }`
   - 429: Rate limited (too many requests) - returns reset time
   - 500: Server error - logs to Sentry, returns generic "something went wrong"

2. **Consent Errors:**
   - Catch-all middleware in every finance API route
   - Specific error codes: `CONSENT_REVOKED`, `CONSENT_EXPIRED`, `NO_CONSENT`, `NO_BANKS`
   - Each code triggers different UI flow (re-consent, renewal, or initial setup)

3. **Injection/Security Errors:**
   - `lib/ai/sanitize.ts` detects prompt injection in user messages
   - High risk: blocks request, logs security event
   - Medium risk: logs warning, allows through

4. **Rate Limit Errors:**
   - Chat endpoint returns 429 with `{ remaining, limit, tier, upgradeRequired }`
   - Frontend shows "too many requests" with upgrade prompt if needed

## Cross-Cutting Concerns

**Logging:** Console in development, Sentry in production for errors; audit trail in database for financial data access.

**Validation:** Zod schemas in `lib/validations/` for request bodies (consents, family, etc.); type-safe via `validateRequestBody()` utility.

**Authentication:** Supabase auth (magic link, password, OAuth) via `createClient()` which handles session refresh; middleware in place on all protected routes.

**Security:**
- All financial data behind consent checks and RLS policies
- User input sanitized against prompt injection before Claude
- API keys stored in env vars (never exposed)
- CORS not needed (same-origin API)
- PDPL audit logging on data access

**Data Privacy:**
- Two AI modes: privacy-first (anonymized) and enhanced (full context) based on user consent
- `lib/ai/data-privacy.ts` handles context anonymization
- System prompts differ based on mode with explicit "don't invent data" rules

---

*Architecture analysis: 2026-01-25*
