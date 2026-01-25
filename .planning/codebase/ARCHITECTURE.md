# Architecture

**Analysis Date:** 2026-01-25

## Pattern Overview

**Overall:** Next.js 16+ full-stack application with modular feature-driven API structure and client-side component hierarchy. The application follows a three-layer architecture: API routes (backend), shared libraries/utilities (business logic), and React components (UI).

**Key Characteristics:**
- Server Components with Suspense boundaries for optimized initial page loads
- Next.js App Router with dynamic rendering enforced for auth-dependent pages
- Feature-gated functionality per subscription tier (free/pro/family)
- Consent-based access control for regulated data (BOBF/PDPL compliance)
- Privacy-first AI architecture with two data modes (anonymized vs. enhanced)

## Layers

**Presentation Layer:**
- Purpose: Render UI components and handle user interactions
- Location: `D:\My Project\Finauraa\components\`, `D:\My Project\Finauraa\app\dashboard\`, `D:\My Project\Finauraa\app\`
- Contains: React components (page layouts, UI primitives, feature-specific components), Hooks for state management
- Depends on: API layer via fetch calls, Zustand stores, Library utilities
- Used by: Page routes in Next.js app directory

**API Layer:**
- Purpose: Handle HTTP requests, enforce authentication, verify consent, coordinate business logic
- Location: `D:\My Project\Finauraa\app\api\`
- Contains: Route handlers (POST/GET/PUT/DELETE), API middleware functions
- Depends on: Supabase client, consent middleware, feature gating utilities, business logic libraries
- Used by: Client-side components, external services

**Business Logic Layer:**
- Purpose: Implement core domain logic, data transformations, privacy handling, rate limiting
- Location: `D:\My Project\Finauraa\lib\`
- Contains: Utilities for AI privacy (anonymization/enhancement), rate limiting, consent checking, feature gating, audit logging, email handling
- Depends on: Supabase database
- Used by: API routes, components

**Data Access Layer:**
- Purpose: Database operations and external service integrations
- Location: `D:\My Project\Finauraa\lib\supabase\`, `D:\My Project\Finauraa\lib\tarabut\`, `D:\My Project\Finauraa\lib\ai\`
- Contains: Supabase client factories (server/client), Tarabut open banking integration, AI service integration
- Depends on: Supabase backend, Anthropic API, Tarabut API, Resend email service
- Used by: Business logic layer

**Supporting Layers:**
- **Middleware:** `D:\My Project\Finauraa\middleware.ts` and `D:\My Project\Finauraa\lib\supabase\middleware.ts` - Auth session management, route protection
- **Constants/Configuration:** `D:\My Project\Finauraa\lib\constants\`, `D:\My Project\Finauraa\lib\features.ts` - Feature flags, subscription tiers, category definitions
- **Types:** `D:\My Project\Finauraa\lib\types.ts`, `D:\My Project\Finauraa\lib\database.types.ts` - Shared type definitions

## Data Flow

**User Authentication & Session:**

1. Request arrives at middleware (`D:\My Project\Finauraa\middleware.ts`)
2. Middleware calls `updateSession()` in `D:\My Project\Finauraa\lib\supabase\middleware.ts`
3. Session validated against Supabase auth
4. If no user and not on auth page, redirect to `/login`
5. If user and on auth page, redirect to `/`
6. Response headers include updated auth cookies

**Chat Message Processing:**

1. Client sends POST to `/api/chat/route.ts` with message array
2. Route handler in `D:\My Project\Finauraa\app\api\chat\route.ts`:
   - Authenticates user via Supabase
   - Checks rate limit (30 req/min) from `D:\My Project\Finauraa\lib\ai\rate-limit.ts`
   - Checks monthly AI query limit based on subscription tier from `D:\My Project\Finauraa\lib\features.ts`
   - Sanitizes conversation history with `D:\My Project\Finauraa\lib\ai\sanitize.ts`
   - Determines user's AI data mode (privacy-first vs enhanced) from `D:\My Project\Finauraa\lib\ai\data-privacy.ts`
   - Fetches appropriate context: anonymized (categories only) or enhanced (full transaction data) based on consent
   - Formats context for system prompt
   - Calls Anthropic Claude API with formatted messages
   - Parses JSON response containing text message and rich content components
3. Response includes rate limit headers, query usage info, and subscription tier

**Financial Data Access:**

1. Client calls `/api/finance/accounts/route.ts` (or similar)
2. Route handler:
   - Authenticates user
   - Calls `requireBankConsent()` from `D:\My Project\Finauraa\lib\consent-middleware.ts`
   - Consent middleware checks if user has active `bank_access` consent
   - If no bank connections, returns empty data (not error)
   - If consent missing/expired, returns 403 Forbidden
   - Logs data access in audit trail
3. If allowed, queries Supabase for bank accounts/transactions
4. Transforms database response to client format
5. Returns data to client or empty array if no banks

**Bank Connection Flow:**

1. User clicks "Connect Bank" button in component
2. Triggers `useBankConnection()` hook in `D:\My Project\Finauraa\hooks\use-bank-connection.tsx`
3. Hook opens `BankConsentDialog` from `D:\My Project\Finauraa\components\dashboard\bank-consent-dialog.tsx`
4. On confirm, calls `/api/tarabut/connect` POST route
5. Route generates Tarabut authorization URL from `D:\My Project\Finauraa\lib\tarabut\client.ts`
6. User redirected to Tarabut consent flow
7. After authorization, Tarabut redirects to callback with auth code
8. Callback route exchanges code for accounts, stores in `bank_connections` and `bank_accounts` tables
9. Subscription tier checked - free users limited to 1 connection, pro to 5, family to 15

**State Management:**

- **Client-side state:** Zustand stores in `D:\My Project\Finauraa\lib\stores\` (e.g., transaction filter state)
- **Page state:** React useState in component files for UI state, scroll position, selection
- **Server state:** Supabase tables (source of truth for all persistent data)
- **Session state:** Supabase auth cookies managed by middleware

## Key Abstractions

**Consent System:**

- Purpose: Enforce BOBF/PDPL compliance for personal financial data access
- Examples: `D:\My Project\Finauraa\lib\consent-middleware.ts`, `D:\My Project\Finauraa\lib\validations\consent.ts`, `D:\My Project\Finauraa\lib\audit.ts`
- Pattern: Consent checked before database queries; access logged for audit trail; `requireBankConsent()` function used in all finance API routes

**Feature Gating:**

- Purpose: Enforce subscription tier limitations on features and usage
- Examples: `D:\My Project\Finauraa\lib\features.ts`, `D:\My Project\Finauraa\lib\features-server.ts`, `D:\My Project\Finauraa\lib\features-db.ts`
- Pattern: `getTierLimits(tier)` returns limits; `checkUsageLimit()` validates usage; routes check tier and return appropriate errors

**AI Data Privacy Modes:**

- Purpose: Allow users to choose between privacy-first (anonymized) and enhanced (full data) AI interactions
- Examples: `D:\My Project\Finauraa\lib\ai\data-privacy.ts`
- Pattern: Two context builders - `getAnonymizedUserContext()` (categories only) and `getEnhancedUserContext()` (full data); user preference stored in `ai_data_mode` on profile; system prompt varies by mode

**Rich Content Components:**

- Purpose: AI responses can trigger structured UI renders beyond text
- Examples: `D:\My Project\Finauraa\components\chat\rich-content.tsx`, component cards in `D:\My Project\Finauraa\components\chat\cards\`
- Pattern: AI returns JSON with `message` (text) and `richContent` array; each item has `type` (e.g., "balance-card", "spending-analysis") and optional `data`; components render accordingly

**Message Storage & Conversation History:**

- Purpose: Persist conversations for retrieval and continued chat context
- Examples: `D:\My Project\Finauraa\app\api\conversations\` routes
- Pattern: Conversations table indexed by user_id; Messages table stores role/content/timestamp; Client-side drawer in `D:\My Project\Finauraa\components\chat\conversation-history-drawer.tsx` lists past conversations

## Entry Points

**Web Application Root:**
- Location: `D:\My Project\Finauraa\app\page.tsx`
- Triggers: Browser navigation to `/`
- Responsibilities: Renders main chat interface with `ChatContainer` component, sidebar navigation, suspense boundary

**Dashboard Entry:**
- Location: `D:\My Project\Finauraa\app\dashboard\page.tsx`
- Triggers: Browser navigation to `/dashboard`
- Responsibilities: Renders dashboard with account overview, transactions, budgets, sidebar, bottom nav

**Authentication Pages:**
- Location: `D:\My Project\Finauraa\app\login\page.tsx`, `D:\My Project\Finauraa\app\signup\page.tsx`
- Triggers: Unauthenticated users or explicit navigation
- Responsibilities: Supabase Auth UI integration

**API Endpoints:**
- Chat: `D:\My Project\Finauraa\app\api\chat\route.ts` - POST messages for AI responses
- Finance: `D:\My Project\Finauraa\app\api\finance\*\route.ts` - GET accounts, transactions, budgets, savings goals
- Family: `D:\My Project\Finauraa\app\api\family\*\route.ts` - Family group management
- Tarabut: `D:\My Project\Finauraa\app\api\tarabut\*\route.ts` - Bank connection flows
- Consents: `D:\My Project\Finauraa\app\api\consents\*\route.ts` - Consent management
- Cron: `D:\My Project\Finauraa\app\api\cron\*\route.ts` - Data retention, consent expiration cleanup

## Error Handling

**Strategy:** Multi-layer error handling with specific status codes and user-friendly messages

**Patterns:**

**Authentication Errors (401):**
- No user found: Return 401, client redirects to login
- Example: `D:\My Project\Finauraa\app\api\chat\route.ts:151`

**Authorization Errors (403):**
- User lacks required consent
- Consent expired or revoked
- Example: `D:\My Project\Finauraa\lib\consent-middleware.ts` returns 403 with detailed error

**Rate Limiting (429):**
- Per-minute rate limit exceeded
- Monthly AI query limit exceeded
- Example: `D:\My Project\Finauraa\app\api\chat\route.ts:154-168` includes rate limit headers and reset time
- Headers: `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`

**Validation Errors (400):**
- Missing required fields
- Invalid request format
- Prompt injection detected (sanitization fails)
- Example: `D:\My Project\Finauraa\app\api\chat\route.ts:223-228`

**Server Errors (500):**
- Database query failures
- External service failures
- Wrapped with try-catch at route level
- Example: `D:\My Project\Finauraa\app\api\chat\route.ts:330-359` includes specific error categorization and retryable flag

**Presentation Errors:**
- Toast notifications via Sonner: `D:\My Project\Finauraa\components\ui\sonner.tsx`
- Empty states for no data: `D:\My Project\Finauraa\components\ui\empty-state.tsx`
- Skeleton loaders for pending data: Components use animate-pulse classes

## Cross-Cutting Concerns

**Logging:**
- Security events logged: Injection attempts, rate limit violations, unusual input patterns
- Function: `logSecurityEvent()` in `D:\My Project\Finauraa\lib\ai\sanitize.ts`
- Audit trail: `logAuditEvent()` in `D:\My Project\Finauraa\lib\audit.ts` for all data access
- Console errors in production catch blocks for debugging

**Validation:**
- Input sanitization in `D:\My Project\Finauraa\lib\ai\sanitize.ts` - detects prompt injection attempts, classifies risk level (low/medium/high)
- Zod validation in `D:\My Project\Finauraa\lib\validations\` for structured data (consent, family, etc.)
- Type-safe database queries with Supabase TypeScript client

**Authentication:**
- Session managed via Supabase JWT in cookies
- Middleware refreshes session on every request
- User object available via `supabase.auth.getUser()` in API routes
- Protected routes redirect to login if no user

**Data Privacy & Consent:**
- Consent middleware checks before all financial data access
- Two AI modes respect user privacy preference
- Anonymization functions transform exact amounts to categories
- Audit trail tracks all financial data accesses with timestamps and endpoints
