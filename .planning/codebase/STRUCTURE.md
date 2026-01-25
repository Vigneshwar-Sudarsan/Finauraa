# Codebase Structure

**Analysis Date:** 2026-01-25

## Directory Layout

```
D:\My Project\Finauraa/
├── app/                      # Next.js App Router - Pages and API routes
│   ├── page.tsx             # Root chat interface
│   ├── layout.tsx           # Root layout with theme/PWA providers
│   ├── globals.css          # Global Tailwind styles
│   ├── auth/                # Auth callback endpoints
│   ├── login/               # Login page
│   ├── signup/              # Signup page
│   ├── dashboard/           # Dashboard pages (protected)
│   ├── family/              # Family features pages
│   └── api/                 # Backend API routes
├── components/              # React components organized by feature
│   ├── ui/                  # Reusable UI primitives (shadcn)
│   ├── chat/                # Chat interface components
│   ├── dashboard/           # Dashboard feature components
│   ├── settings/            # Settings components
│   ├── spending/            # Spending/budget components
│   ├── theme-provider.tsx   # Theme context provider
│   ├── app-sidebar.tsx      # Main navigation sidebar
│   └── pwa-install-prompt.tsx
├── lib/                     # Shared business logic and utilities
│   ├── ai/                  # AI-related utilities
│   ├── supabase/            # Supabase client factories
│   ├── tarabut/             # Tarabut open banking client
│   ├── stores/              # Zustand state stores
│   ├── validations/         # Zod validation schemas
│   ├── constants/           # Configuration constants
│   ├── types.ts             # Shared TypeScript types
│   ├── features.ts          # Feature gating config
│   ├── consent-middleware.ts # Consent checking
│   ├── audit.ts             # Audit logging
│   ├── email.ts             # Email utilities (Resend)
│   └── database.types.ts    # Supabase auto-generated types
├── hooks/                   # Custom React hooks
│   ├── use-bank-connection.tsx
│   ├── use-feature-access.ts
│   └── use-mobile.ts
├── scripts/                 # Utility scripts
├── supabase/                # Database migrations and config
│   └── migrations/
├── public/                  # Static assets
│   ├── icons/              # PWA icons
│   └── screenshots/
├── .planning/              # GSD planning documents
├── middleware.ts           # Next.js middleware for auth
├── next.config.ts          # Next.js configuration with PWA
├── package.json            # Dependencies
├── tailwind.config.ts      # Tailwind CSS config
├── tsconfig.json           # TypeScript config
└── docs/                   # Documentation
```

## Directory Purposes

**`app/`** - Next.js App Router application structure
- Contains all page routes and API endpoints
- Server-side rendering with optional Suspense boundaries
- Dynamic pages enforce `force-dynamic` for auth-dependent content
- Public routes: `/login`, `/signup`, `/auth/*`
- Protected routes: `/`, `/dashboard/*`, `/family/*` (redirect via middleware if not authenticated)

**`app/api/`** - Backend REST API endpoints
- `/api/chat/` - AI message processing (POST)
- `/api/finance/` - Account, transaction, budget, savings goal endpoints
- `/api/family/` - Family group and member management
- `/api/consents/` - Consent management and retrieval
- `/api/tarabut/` - Bank connection/disconnection flows
- `/api/cron/` - Background jobs (data retention, consent expiration)
- `/api/admin/` - Admin-only feature flag management
- Each route implements authentication and consent checks

**`app/dashboard/`** - Dashboard feature pages
- `/dashboard` - Main dashboard with account overview
- `/dashboard/accounts/` - Account list and detail views
- `/dashboard/transactions/` - Transaction history
- `/dashboard/spending/` - Spending analysis and charts
- `/dashboard/goals/` - Savings goals management
- `/dashboard/settings/*` - User settings (profile, privacy, notifications, subscription, connected banks, family, AI privacy)

**`components/`** - React component hierarchy
- **`ui/`** - Primitives from shadcn/ui: button, card, dialog, sidebar, tabs, etc.
- **`chat/`** - Chat interface: ChatContainer, ChatInput, ChatMessage, ConversationHistory, rich content cards
- **`dashboard/`** - Dashboard layouts: DashboardContent, AccountTabs, TransactionsList, SpendingContent, etc.
- **`settings/`** - Settings forms and dialogs
- **`spending/`** - Budget and savings goal components

**`lib/`** - Shared business logic
- **`ai/`**:
  - `data-privacy.ts` - Anonymized/enhanced context generation for AI
  - `sanitize.ts` - Prompt injection detection and input sanitization
  - `rate-limit.ts` - Rate limiting logic (30 req/min per user)
- **`supabase/`**:
  - `server.ts` - Server-side Supabase client factory
  - `client.ts` - Client-side Supabase client factory
  - `middleware.ts` - Auth session refresh and route protection
- **`tarabut/`**:
  - `client.ts` - Tarabut API client for open banking
  - `types.ts` - Tarabut response types
- **`stores/`** - Zustand store definitions (e.g., transaction filters)
- **`validations/`** - Zod validation schemas (consent, family)
- **`constants/`** - Category definitions
- **`features.ts`** - Feature gating: subscription tier limits and feature availability
- **`features-server.ts`** - Server-side feature check functions
- **`features-db.ts`** - Database queries for feature limits
- **`consent-middleware.ts`** - Consent verification for data access
- **`audit.ts`** - Audit logging functions
- **`email.ts`** - Resend email client and templates
- **`types.ts`** - Shared TypeScript interfaces (Message, Transaction, Budget, Family types)
- **`database.types.ts`** - Auto-generated Supabase TypeScript types from schema

**`hooks/`** - Custom React hooks
- `use-bank-connection.tsx` - Bank connection flow with consent dialog
- `use-feature-access.ts` - Feature availability checking
- `use-mobile.ts` - Mobile viewport detection

**`supabase/`** - Database migrations and schema
- `migrations/` - SQL migration files tracked in version control
- Database schema defines tables for users, profiles, bank_connections, bank_accounts, transactions, budgets, savings_goals, messages, conversations, user_consents, family_groups, family_members, audit_logs, feature_flags

**`public/`** - Static assets served directly
- PWA icons (multiple sizes for iOS/Android)
- Screenshot images
- `manifest.json` generated at build time by next-pwa

**`middleware.ts`** - Next.js request middleware
- Runs on every request before routing
- Calls `updateSession()` from `lib/supabase/middleware.ts`
- Redirects unauthenticated users to `/login`
- Redirects authenticated users away from auth pages
- Excludes static assets and PWA files from middleware

## Key File Locations

**Entry Points:**
- `D:\My Project\Finauraa\app\layout.tsx` - Root layout wrapping all pages
- `D:\My Project\Finauraa\app\page.tsx` - Main chat page
- `D:\My Project\Finauraa\app\dashboard\page.tsx` - Dashboard root
- `D:\My Project\Finauraa\middleware.ts` - Global middleware for auth

**Configuration:**
- `D:\My Project\Finauraa\package.json` - Dependencies and scripts
- `D:\My Project\Finauraa\next.config.ts` - Next.js config with PWA plugin
- `D:\My Project\Finauraa\tailwind.config.ts` - Tailwind CSS customization
- `D:\My Project\Finauraa\tsconfig.json` - TypeScript configuration with path aliases

**Core Business Logic:**
- `D:\My Project\Finauraa\lib\features.ts` - Feature/tier configuration (source of truth)
- `D:\My Project\Finauraa\lib\ai\data-privacy.ts` - AI context generation
- `D:\My Project\Finauraa\lib\consent-middleware.ts` - Consent checking
- `D:\My Project\Finauraa\lib\audit.ts` - Audit logging

**API Routes (Critical):**
- `D:\My Project\Finauraa\app\api\chat\route.ts` - Main AI chat endpoint
- `D:\My Project\Finauraa\app\api\finance\accounts\route.ts` - Account listing
- `D:\My Project\Finauraa\app\api\finance\transactions\route.ts` - Transaction history
- `D:\My Project\Finauraa\app\api\tarabut\connect\route.ts` - Bank connection initiation
- `D:\My Project\Finauraa\app\api\consents\route.ts` - Consent creation/retrieval

**Component Roots:**
- `D:\My Project\Finauraa\components\app-sidebar.tsx` - Main navigation
- `D:\My Project\Finauraa\components\chat\chat-container.tsx` - Chat UI root
- `D:\My Project\Finauraa\components\dashboard\dashboard-content.tsx` - Dashboard root

## Naming Conventions

**Files:**
- `.tsx` for React components (client or server)
- `.ts` for non-React code (utilities, hooks, types)
- `route.ts` for Next.js API handlers
- `page.tsx` for Next.js page components
- `layout.tsx` for Next.js layout wrappers
- Kebab-case for filenames: `use-bank-connection.tsx`, `chat-input.tsx`, `dashboard-content.tsx`

**Directories:**
- Feature-based organization in `components/` and `app/`
- Group related files by feature: `chat/`, `dashboard/`, `spending/`, `settings/`
- Lowercase with hyphens: `bank-connection`, `chat-container`, `spending-summary`
- API routes mirror domain structure: `/api/finance/accounts`, `/api/family/members/invite`

**Functions & Exports:**
- PascalCase for React components: `ChatContainer`, `DashboardContent`, `AccountTabs`
- camelCase for utility functions: `sanitizeUserInput()`, `checkRateLimit()`, `getAnonymizedUserContext()`
- camelCase for hooks: `useBankConnection()`, `useFeatureAccess()`, `useMobile()`
- UPPER_SNAKE_CASE for constants: `TIER_LIMITS`, `FEATURE_NAMES`, `NOTIFICATION_FEATURES`

**Types & Interfaces:**
- PascalCase for types: `Message`, `Transaction`, `BankAccount`, `FamilyGroup`
- Suffix with `Type` or similar if needed for clarity
- Database types in `lib/database.types.ts` auto-generated from schema

## Where to Add New Code

**New Feature (e.g., Bill Payments):**

1. **Create pages:**
   - Add route in `app/dashboard/payments/page.tsx`
   - Create layout if needed in `app/dashboard/payments/layout.tsx`

2. **Create API routes:**
   - `app/api/finance/payments/route.ts` - List payments
   - `app/api/finance/payments/[id]/route.ts` - Get single payment
   - Add consent check: `requireBankConsent()` from `lib/consent-middleware.ts`
   - Add feature gating: `checkFeatureAccess()` from `lib/features-server.ts`

3. **Create components:**
   - `components/dashboard/payments-content.tsx` - Main feature component
   - `components/dashboard/payments-list.tsx` - Payment list display
   - `components/dashboard/payment-detail-sheet.tsx` - Detail modal
   - Place in `components/dashboard/` since it's dashboard-related

4. **Create types:**
   - Add to `lib/types.ts` if shared: `interface Payment { ... }`
   - Reference existing payment fields from database

5. **Create utilities:**
   - If complex logic: `lib/payments.ts` with helper functions
   - Import and use in API routes

6. **Add feature gating:**
   - Update `lib/features.ts` - Add `billPayments: boolean` to TierLimits
   - Update `TIER_LIMITS` object with tier-specific limits
   - Check in route: `if (!isFeatureAvailable(tier, 'billPayments')) return 403`

**New Component/Module:**

1. **Location decision:**
   - If reusable UI primitive: `components/ui/`
   - If feature-specific: `components/{feature}/`
   - If page root: `app/{route}/`

2. **Naming:**
   - File: PascalCase with `.tsx` extension
   - Export: PascalCase component name
   - Use consistent naming with rest of codebase

3. **Example - New card component:**
   ```typescript
   // components/chat/cards/payment-card.tsx
   export function PaymentCard({ data }: { data: { paymentId: string } }) {
     // Fetch and render payment details
   }
   ```

**Utilities & Helpers:**

1. **Location:** `lib/{domain}/` or top-level `lib/utils.ts`
   - `lib/payments.ts` for payment-domain logic
   - `lib/ai/` for AI-related utilities
   - `lib/utils.ts` for generic helpers

2. **Export pattern:**
   ```typescript
   export function calculatePaymentTotal(payments: Payment[]): number { ... }
   export async function fetchPaymentHistory(userId: string): Promise<Payment[]> { ... }
   ```

3. **Imports in other files:**
   - `import { calculatePaymentTotal } from '@/lib/payments'`
   - Use `@/` path alias defined in `tsconfig.json`

## Special Directories

**`supabase/migrations/`:**
- Purpose: SQL migration files for database schema
- Generated: No (manually written)
- Committed: Yes (version controlled)
- Each file: SQL statements to apply sequentially
- Naming: `{timestamp}_{description}.sql`

**`.next/`:**
- Purpose: Next.js build output
- Generated: Yes (by `npm run build`)
- Committed: No (.gitignored)
- Contains compiled JavaScript, source maps, server functions

**`node_modules/`:**
- Purpose: NPM dependencies
- Generated: Yes (by `npm install`)
- Committed: No (.gitignored)
- Lock file: `package-lock.json` (committed)

**`.planning/`:**
- Purpose: GSD planning documents
- Generated: No (manually written or by GSD)
- Committed: Yes
- Contains ARCHITECTURE.md, STRUCTURE.md, CONVENTIONS.md, etc.

## Path Aliases

Configured in `tsconfig.json`:
- `@/` → `D:\My Project\Finauraa\` (root)
- Use in all imports: `import { Button } from '@/components/ui/button'`
- Never use relative imports like `../../`

## File Size Guidelines

Consider refactoring if:
- Component file > 300 lines: Split into smaller components
- API route > 200 lines: Extract logic to `lib/{domain}.ts`
- Utility file > 400 lines: Split into multiple files by responsibility

Examples of well-sized files:
- `components/chat/chat-input.tsx` - ~150 lines (input + submission logic)
- `app/api/chat/route.ts` - ~360 lines (auth, rate limit, AI call, response)
- `lib/ai/data-privacy.ts` - ~450 lines (anonymization + enhancement logic)
