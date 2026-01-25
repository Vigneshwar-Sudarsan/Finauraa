# Technology Stack

**Analysis Date:** 2026-01-25

## Languages

**Primary:**
- TypeScript 5 - Full codebase, strict mode enabled, React components and Node.js backend
- React 19.2.3 - Frontend UI framework with React DOM 19.2.3

**Secondary:**
- JavaScript - Configuration files (ESLint, Next.js config)
- CSS/Tailwind - Styling via Tailwind CSS 4 with PostCSS plugin

## Runtime

**Environment:**
- Node.js (inferred from package.json - no explicit version specified in .nvmrc)

**Package Manager:**
- npm (lock file: `package-lock.json` present, version 10+)
- Lockfile: Present and committed

## Frameworks

**Core:**
- Next.js 16.1.3 - Full-stack React framework, API routes, middleware support
- React 19.2.3 - Component library with latest hooks and RSC support

**UI Component Libraries:**
- Radix UI 1.4.3 - Headless component primitives
- shadcn 3.7.0 - Pre-built component library (installed as dev dependency)
- Base UI React 1.1.0 - Additional component library
- Lucide React 0.562.0 - Icon library (SVG icons)
- Phosphor Icons React 2.1.10 - Additional icon set

**State Management:**
- Zustand 5.0.10 - Lightweight state management (reference: `lib/stores/transaction-filter-store.ts`)
- SWR 2.3.8 - Data fetching and caching with React hooks

**Styling:**
- Tailwind CSS 4 - Utility-first CSS framework
- Tailwind CSS PostCSS 4 - PostCSS plugin for Tailwind
- Tailwind Merge 3.4.0 - Utility class merge library for conditional styles
- tw-animate-css 1.4.0 - Animation utilities
- Class Variance Authority 0.7.1 - CSS class composition library

**UI Enhancements:**
- Sonner 2.0.7 - Toast notifications
- Vaul 1.1.2 - Drawer/modal component
- React Day Picker 9.13.0 - Date picker component
- Date-fns 4.1.0 - Date manipulation library
- Next Themes 0.4.6 - Theme switching (dark/light mode)

**Progressive Web App:**
- @ducanh2912/next-pwa 10.2.9 - PWA support with service workers and offline caching
  - Workbox configuration for runtime caching with 24-hour expiration
  - Network-first strategy with 3-second timeout for faster fallback
  - Disabled in development mode

**Testing:**
- Not detected in package.json (no Jest, Vitest, or other test runners)

**Build/Dev:**
- ESLint 9 - Linting
- ESLint Config Next 16.1.3 - Next.js specific ESLint rules
- Sharp 0.34.5 - Image optimization (used by Next.js Image component)

## Key Dependencies

**Critical:**
- @supabase/supabase-js 2.90.1 - PostgreSQL database with real-time subscriptions
- @supabase/ssr 0.8.0 - Server-side rendering integration with Supabase auth
- Stripe 20.2.0 - Payment processing (subscriptions, billing, webhooks)
- @anthropic-ai/sdk 0.71.2 - Claude AI integration for financial insights
- Resend 6.8.0 - Email service for transactional notifications

**Infrastructure:**
- @sentry/nextjs 10.35.0 - Error tracking and performance monitoring
- Zustand 5.0.10 - Client-side state persistence

## Configuration

**Environment:**
Configured via `.env.local` (not committed) with settings from `.env.example`:
- Tarabut Gateway (Open Banking API credentials)
- Supabase URL and API keys
- Anthropic API key
- Stripe keys and webhook secret
- Stripe price IDs for monthly/yearly plans (Pro and Family plans)
- Resend email API key and sender email
- Feature flags configuration (database-driven or static)
- Admin email list for feature flag management
- Cron job authentication secret
- App URL for Stripe redirects

**Build:**
- `next.config.ts` - Next.js configuration with PWA plugin
- `tsconfig.json` - TypeScript compiler options (target ES2017, moduleResolution: bundler)
- `middleware.ts` - Next.js middleware for auth/session management
- `components.json` - Shadcn component library configuration
- `eslint.config.mjs` - ESLint configuration
- `vercel.json` - Vercel deployment configuration with cron jobs

## Platform Requirements

**Development:**
- Node.js runtime
- npm package manager
- TypeScript 5+
- Supabase project (for local development)

**Production:**
- Vercel (deployment platform specified in `vercel.json`)
- Environment variables for all external services (Stripe, Supabase, Anthropic, Resend, Tarabut)
- Cron job support via Vercel for scheduled tasks

## Deployment & CI/CD

**Hosting:**
- Vercel - Full-stack deployment with serverless functions
- Edge functions capable (PWA with service workers)

**Cron Jobs (Vercel):**
Defined in `vercel.json`:
- `/api/cron/expire-consents` - Daily at 00:00 (expiry warning emails)
- `/api/cron/data-retention` - Daily at 01:00 (PDPL compliance cleanup)
- `/api/cron/sync-banks` - Daily at 06:00 (Tarabut bank data sync)

**Database:**
- Supabase (PostgreSQL + PostgREST API)
- Real-time subscriptions via Supabase
- Row-level security (RLS) for multi-tenant isolation

---

*Stack analysis: 2026-01-25*
