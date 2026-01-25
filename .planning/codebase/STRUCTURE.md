# Codebase Structure

**Analysis Date:** 2026-01-25

## Directory Layout

```
finauraa/
├── app/                        # Next.js App Router pages and API routes
│   ├── api/                    # REST API endpoints (domain-organized)
│   │   ├── admin/              # Admin endpoints (feature flags, audit)
│   │   ├── chat/               # AI chat route handler
│   │   ├── consents/           # User consent management
│   │   ├── conversations/      # Chat conversation history
│   │   ├── cron/               # Background jobs (data sync, cleanup)
│   │   ├── family/             # Family group operations
│   │   ├── finance/            # Financial data endpoints
│   │   │   ├── accounts/       # Bank accounts list/detail
│   │   │   ├── budgets/        # Budget CRUD
│   │   │   ├── categories/     # Spending categories
│   │   │   ├── cash-flow/      # Cash flow predictions
│   │   │   ├── connections/    # Bank connection status
│   │   │   ├── family/         # Family financial data
│   │   │   ├── health/         # Financial health score
│   │   │   ├── insights/       # Spending/income analytics
│   │   │   ├── recurring/      # Recurring expense detection
│   │   │   ├── refresh/        # Manual data sync triggers
│   │   │   ├── savings-goals/  # Personal savings goals
│   │   │   ├── spending/       # Spending analysis
│   │   │   └── summary/        # Monthly summaries
│   │   ├── insights/           # Analytics endpoints
│   │   ├── notifications/      # Push/email notification delivery
│   │   ├── subscription/       # Stripe webhook, tier management
│   │   ├── tarabut/            # Bank integration webhooks
│   │   ├── user/               # User profile, data export
│   │   └── webhooks/           # External service webhooks
│   ├── auth/                   # Auth pages (signup, login flow)
│   ├── dashboard/              # Protected dashboard pages
│   │   ├── accounts/           # Account details view
│   │   ├── goals/              # Savings goals view
│   │   ├── payments/           # Subscription/payments page
│   │   ├── settings/           # User settings
│   │   ├── spending/           # Spending analytics dashboard
│   │   └── transactions/       # Transaction history view
│   ├── family/                 # Family group pages
│   ├── forgot-password/        # Password recovery flow
│   ├── login/                  # Login page
│   ├── reset-password/         # Password reset flow
│   ├── signup/                 # Sign up page
│   ├── error.tsx               # App-level error boundary
│   ├── globals.css             # Global Tailwind styles
│   ├── layout.tsx              # Root layout with providers
│   ├── page.tsx                # Home/chat page
│   └── favicon.ico             # App icon
│
├── components/                 # React components (organized by domain)
│   ├── chat/                   # Chat interface components
│   │   ├── cards/              # Rich content card components
│   │   │   ├── action-buttons.tsx      # Interactive action buttons
│   │   │   ├── ai-mode-intro.tsx       # AI mode selection intro
│   │   │   ├── balance-card.tsx        # Account balance display
│   │   │   ├── bank-connected.tsx      # Bank status indicator
│   │   │   ├── budget-card.tsx         # Single budget detail
│   │   │   ├── budget-overview.tsx     # All budgets summary
│   │   │   ├── cash-flow.tsx           # Cash flow projection
│   │   │   ├── financial-health.tsx    # Health score card
│   │   │   ├── recurring-expenses.tsx  # Recurring bills list
│   │   │   ├── savings-goal-setup.tsx  # Goal creation form
│   │   │   ├── savings-goals.tsx       # Goals progress view
│   │   │   ├── spending-analysis.tsx   # Category breakdown
│   │   │   └── transactions-list.tsx   # Recent transactions
│   │   ├── chat-container.tsx          # Main chat wrapper, state management
│   │   ├── chat-header.tsx             # Chat title/actions bar
│   │   ├── chat-input.tsx              # Message input field
│   │   ├── chat-message.tsx            # Individual message renderer
│   │   ├── conversation-history-drawer.tsx  # Sidebar with past chats
│   │   ├── feature-guide.tsx           # Feature walkthrough/tutorial
│   │   ├── quick-actions.tsx           # Suggested action buttons
│   │   ├── rich-content.tsx            # Rich content router/switcher
│   │   └── index.ts                    # Barrel exports
│   ├── dashboard/              # Dashboard page components
│   │   ├── account-detail-content.tsx  # Account transaction view
│   │   ├── account-tabs.tsx            # Tab navigation in account detail
│   │   ├── accounts-content.tsx        # All accounts list
│   │   ├── bank-consent-dialog.tsx     # Consent request modal
│   │   ├── bank-selector.tsx           # Bank selection UI
│   │   ├── connections-list.tsx        # Connected banks list
│   │   ├── dashboard-bottom-nav.tsx    # Mobile navigation
│   │   ├── dashboard-content.tsx       # Main dashboard router/switcher
│   │   └── transactions-content.tsx    # Transaction list view
│   ├── settings/               # Settings page components
│   │   ├── profile-tab.tsx     # User profile settings
│   │   ├── subscription-tab.tsx # Subscription management
│   │   ├── family-tab.tsx      # Family group settings
│   │   └── privacy-tab.tsx     # Consent and privacy settings
│   ├── spending/               # Spending/goals components
│   │   ├── savings-goal-sheet.tsx # Goal creation drawer
│   │   ├── spending-category-detail.tsx # Category analytics
│   │   └── monthly-spending-card.tsx # Monthly summary
│   ├── ui/                     # Shadcn UI base components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── sidebar.tsx
│   │   ├── sonner.tsx          # Toast notification system
│   │   └── [other base UI]
│   ├── app-sidebar.tsx         # Main navigation sidebar
│   ├── feature-gate.tsx        # Feature flag wrapper
│   ├── mobile-nav.tsx          # Mobile navigation menu
│   ├── pwa-install-prompt.tsx  # PWA install banner
│   └── theme-provider.tsx      # Dark/light theme context
│
├── hooks/                      # Custom React hooks
│   ├── use-ai-mode.ts          # AI privacy mode selection
│   ├── use-api-call.ts         # Generic async API call hook (most important)
│   ├── use-bank-connection.tsx # Bank account connection flow
│   ├── use-bank-connections.ts # Multiple bank connections management
│   ├── use-categories.ts       # Transaction categories
│   ├── use-dialog-form.ts      # Dialog open/close state
│   ├── use-family-group.ts     # Family group data fetching
│   ├── use-feature-access.ts   # Feature flag checking
│   ├── use-mobile.ts           # Mobile viewport detection
│   ├── use-profile.ts          # User profile data
│   ├── use-savings-goals.ts    # Personal savings goals
│   ├── use-spending.ts         # Monthly spending data
│   ├── use-subscription.ts     # Subscription tier info
│   └── use-transactions.ts     # Transaction list fetching
│
├── lib/                        # Utilities and business logic
│   ├── ai/                     # AI chat and context utilities
│   │   ├── data-privacy.ts     # Anonymization and privacy modes
│   │   ├── finance-manager.ts  # Financial data aggregation and analysis
│   │   ├── rate-limit.ts       # Rate limiting logic
│   │   └── sanitize.ts         # Prompt injection detection
│   ├── supabase/               # Database client setup
│   │   ├── client.ts           # Browser client
│   │   ├── middleware.ts       # Auth middleware for requests
│   │   └── server.ts           # Server client for API routes
│   ├── stores/                 # Zustand state stores
│   │   └── transaction-filter-store.ts # Filter state (type, category, date range)
│   ├── tarabut/                # Bank integration utilities
│   │   └── [Bank API helpers]
│   ├── validations/            # Zod validation schemas
│   │   ├── consent.ts          # Consent request schemas
│   │   └── family.ts           # Family group schemas
│   ├── constants/              # Constants and configuration
│   │   └── [Feature flags, tier limits, etc.]
│   ├── audit.ts                # Audit logging for compliance
│   ├── consent-middleware.ts   # Consent verification middleware
│   ├── constants.ts            # App-wide constants
│   ├── database.types.ts       # Generated Supabase types
│   ├── date-utils.ts           # Date formatting and calculations
│   ├── email.ts                # Email template helpers
│   ├── features.ts             # Feature flag utilities
│   ├── features-db.ts          # Feature flag database queries
│   ├── features-server.ts      # Server-side feature checks
│   ├── ratelimit.ts            # Rate limiting configuration
│   ├── sync-config.ts          # Bank data sync configuration
│   ├── swr-config.tsx          # SWR provider setup
│   ├── types.ts                # Shared TypeScript types
│   └── utils.ts                # General utilities (format, parse, ID generation)
│
├── public/                     # Static assets
│   ├── icons/                  # PWA and favicon icons
│   └── screenshots/            # Demo screenshots
│
├── supabase/                   # Database migrations and config
│   └── migrations/             # SQL migration files
│
├── docs/                       # Documentation (if present)
│
├── scripts/                    # Utility scripts
│
├── .planning/                  # GSD planning documents
│   └── codebase/               # Architecture/structure analysis
│
├── package.json                # Dependencies
├── tsconfig.json               # TypeScript config
├── next.config.ts              # Next.js config (PWA setup)
├── tailwind.config.ts          # Tailwind CSS config
├── .eslintrc.json              # ESLint config
└── vercel.json                 # Vercel deployment config
```

## Directory Purposes

**app/**
- Purpose: Next.js 16 App Router entry point; combines page routes and API endpoints
- Contains: React pages (TSX), layouts, error boundaries, API route handlers
- Key files: `layout.tsx` (root provider setup), `page.tsx` (home), `globals.css` (base styles)

**components/**
- Purpose: Reusable React component library organized by feature domain
- Contains: Page sections, UI components, complex component trees
- Key pattern: Each feature has a directory (chat/, dashboard/, spending/) with related components

**hooks/**
- Purpose: Encapsulate data fetching and state management logic
- Contains: Custom React hooks using `useApiCall` for API calls, `useCallback` for memoization
- Pattern: File naming follows `use-[feature].ts`; most are thin wrappers around `useApiCall` with specific URLs

**lib/**
- Purpose: Core business logic, utilities, and configuration
- Contains: Type definitions, validators, helpers, external service integration
- Key subdirectories: `ai/` (Claude context building), `supabase/` (database client), `validations/` (Zod schemas)

**app/api/**
- Purpose: Server-side REST API endpoints handling all business logic
- Contains: Route handlers (route.ts files) organized by domain
- Pattern: Each endpoint checks auth first, then consent, then performs logic, returns JSON

**public/**
- Purpose: Static files served by Next.js (images, icons, manifests)
- Contains: PWA icons, app logos, any public downloadable assets

**supabase/**
- Purpose: Database schema and migrations
- Contains: SQL migration files defining tables, RLS policies, triggers

## Key File Locations

**Entry Points:**
- `app/page.tsx`: Home/chat interface (authenticated)
- `app/layout.tsx`: Root layout with ThemeProvider, SWRProvider, Toaster
- `app/dashboard/page.tsx`: Dashboard hub for finance views
- `app/login/page.tsx`: Login page

**Configuration:**
- `tsconfig.json`: TypeScript compiler options with `@/*` path alias
- `next.config.ts`: Next.js 16 with PWA plugin
- `tailwind.config.ts`: Tailwind CSS (v4) with custom colors
- `package.json`: Dependencies and scripts (dev, build, start, lint)

**Core Logic:**
- `lib/ai/finance-manager.ts`: Aggregates user financial data for AI context
- `lib/ai/data-privacy.ts`: Implements privacy modes (anonymized vs enhanced)
- `lib/consent-middleware.ts`: Verifies PDPL consent before data access
- `lib/types.ts`: Message, transaction, family, and user type definitions
- `hooks/use-api-call.ts`: Core hook for all API calls with loading/error/data

**Testing:**
- Test files co-located with source (not yet created in current codebase)
- Suggested pattern: `components/chat/__tests__/chat-container.test.tsx`

**Styling:**
- `app/globals.css`: Global styles and Tailwind directives
- Component styles: Inline Tailwind classes (no external CSS files)
- Theme: Dark theme default with light mode support via `next-themes`

## Naming Conventions

**Files:**
- React components: `CamelCase.tsx` (e.g., `ChatContainer.tsx`)
- Utilities/functions: `kebab-case.ts` (e.g., `use-api-call.ts`)
- Directories: `kebab-case` (e.g., `chat-input`)
- API routes: `route.ts` at path matching resource (e.g., `app/api/chat/route.ts`)

**Functions:**
- React components: PascalCase (e.g., `function ChatContainer()`)
- Hooks: camelCase starting with `use` (e.g., `useApiCall()`)
- Utilities: camelCase (e.g., `formatCurrency()`)
- API handlers: `GET()`, `POST()`, `DELETE()`, etc. (exported functions)

**Variables:**
- Constants: UPPER_SNAKE_CASE (e.g., `WELCOME_MESSAGE_NO_BANK`)
- Objects/arrays: camelCase (e.g., `richContent`, `spendingPatterns`)
- TypeScript types: PascalCase (e.g., `interface FinanceManagerContext`, `type MessageRole`)

**Types:**
- Interfaces: PascalCase, prefix with `I` if needed for clarity (e.g., `FinanceManagerContext`)
- Union types: PascalCase (e.g., `MessageRole = "user" | "assistant"`)
- Enums: Avoid; use Zod enums and `z.infer` instead (e.g., `consentTypeSchema`)

## Where to Add New Code

**New Chat Feature (AI capability):**
- Add message type to `lib/types.ts` in `MessageContentType` union
- Create card component in `components/chat/cards/[feature].tsx`
- Export from `components/chat/cards/index.ts`
- Update `chat-container.tsx` to render new card via `RichContent` component
- Update system prompt in `app/api/chat/route.ts` with new capability
- Add context data gathering in `lib/ai/finance-manager.ts` if needed

**New Financial Data Endpoint:**
- Create directory structure: `app/api/finance/[feature]/`
- Add `route.ts` with GET/POST handlers
- Call `requireBankConsent()` middleware first
- Query Supabase via `createClient()` or `createAdminClient()`
- Return typed JSON response
- Create hook in `hooks/use-[feature].ts` wrapping `useApiCall()`
- Import hook in component and call with `const { data, loading } = use[Feature]()`

**New Component:**
- Determine if page or reusable: page → `app/`, component → `components/[domain]/`
- If API data needed: create hook in `hooks/` first, then import in component
- Use Tailwind for styling (no CSS files)
- Export from barrel file if reusable (`index.ts` in parent directory)
- Type all props with TypeScript interfaces

**New Validation Schema:**
- Add Zod schema to appropriate file in `lib/validations/`
- Export both schema and inferred type: `export type MyInput = z.infer<typeof mySchema>`
- Use in API route via `validateRequestBody(mySchema, body)`
- Return detailed error with `formatZodError()` if validation fails

**New Utility Function:**
- Add to existing `lib/utils.ts` or create new domain-specific file
- Export from `lib/` (e.g., `lib/date-utils.ts`)
- Document with JSDoc comment block
- Example: `export function calculateSavingsRate(income: number, saved: number): number`

**New Zustand Store:**
- Create file in `lib/stores/[feature]-store.ts`
- Define interface for store state and actions
- Export hook: `export const use[Feature]Store = create<[Feature]State>(...)`
- Import and use in components: `const { value, setValue } = use[Feature]Store()`

**New API Integration (third-party service):**
- Create utilities in `lib/[service]/` directory
- Define types matching service response format
- Export wrapper functions (not raw API calls)
- Use in API routes, not directly in components
- Store API keys in environment variables

## Special Directories

**lib/constants/:**
- Purpose: Feature flags, tier limits, category definitions, static lookup data
- Generated: No (hand-maintained)
- Committed: Yes

**.next/:**
- Purpose: Build output from Next.js compiler
- Generated: Yes (on `npm run build`)
- Committed: No (in .gitignore)

**supabase/migrations/:**
- Purpose: SQL schema evolution tracked in version control
- Generated: No (hand-written SQL)
- Committed: Yes (essential for reproducibility)

**node_modules/:**
- Purpose: npm dependencies
- Generated: Yes (from package-lock.json)
- Committed: No (in .gitignore)

---

*Structure analysis: 2026-01-25*
