# Technology Stack

**Analysis Date:** 2026-01-25

## Languages

**Primary:**
- TypeScript 5.x - All application code (frontend and API routes)
- JSX/TSX - React components and page layouts

**Secondary:**
- JavaScript - Configuration files (postcss.config.mjs, eslint.config.mjs)

## Runtime

**Environment:**
- Node.js (version not specified in lock files, but next 16.1.3 requires Node 18+)
- Next.js 16.1.3 (App Router-based SSR/SSG framework)

**Package Manager:**
- npm - Lockfile present (package-lock.json)

## Frameworks

**Core:**
- Next.js 16.1.3 - Full-stack React framework with API routes, SSR, and static generation
- React 19.2.3 - UI library with modern features
- React DOM 19.2.3 - React rendering library

**UI & Styling:**
- Tailwind CSS 4.x - Utility-first CSS framework
- PostCSS 4.x (@tailwindcss/postcss) - CSS processor for Tailwind
- shadcn/ui 3.7.0 - Component library (installed via package, used via components.json)
- Radix UI 1.4.3 - Headless UI components (form primitives, dialogs, etc.)
- Base UI 1.1.0 - Unstyled component library for complex interactions
- Lucide React 0.562.0 - Icon library
- Phosphor Icons 2.1.10 - Alternative icon set
- class-variance-authority 0.7.1 - CSS class composition utility for components
- clsx 2.1.1 - Conditional classname builder
- tailwind-merge 3.4.0 - Merge Tailwind CSS classes intelligently
- tw-animate-css 1.4.0 - Animated Tailwind utilities

**UI Interaction:**
- vaul 1.1.2 - Drawer component library
- sonner 2.0.7 - Toast notifications
- next-themes 0.4.6 - Dark mode theme management
- react-day-picker 9.13.0 - Date picker component

**State Management:**
- Zustand 5.0.10 - Lightweight state management library

## Key Dependencies

**Critical:**
- @supabase/supabase-js 2.90.1 - PostgreSQL database and authentication client
- @supabase/ssr 0.8.0 - Supabase helper utilities for Server-Side Rendering
- stripe 20.2.0 - Payment processing and subscription management
- @anthropic-ai/sdk 0.71.2 - Claude AI integration for financial insights chatbot

**Infrastructure & Observability:**
- @sentry/nextjs 10.35.0 - Error tracking and monitoring
- @ducanh2912/next-pwa 10.2.9 - Progressive Web App capabilities with Workbox
- sharp 0.34.5 - Image optimization and processing

**Date & Time:**
- date-fns 4.1.0 - Date manipulation and formatting utilities

**Utilities:**
- resend 6.8.0 - Transactional email service integration

## Configuration

**Environment:**
- Configured via `.env.local` with following categories:
  - **Tarabut Open Banking:** `TARABUT_CLIENT_ID`, `TARABUT_CLIENT_SECRET`, `TARABUT_REDIRECT_URI`
  - **Supabase:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
  - **Stripe:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRO_PRICE_ID_MONTHLY`, `STRIPE_PRO_PRICE_ID_YEARLY`, `STRIPE_FAMILY_PRICE_ID_MONTHLY`, `STRIPE_FAMILY_PRICE_ID_YEARLY`
  - **Claude AI:** `ANTHROPIC_API_KEY`
  - **Email (Resend):** `RESEND_API_KEY`, `EMAIL_FROM`
  - **Feature Flags:** `USE_DYNAMIC_FEATURES`, `ADMIN_EMAILS`
  - **App URLs:** `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - **Cron Jobs:** `CRON_SECRET`
  - **Compliance:** `DATA_RETENTION_AFTER_REVOCATION_DAYS`

**TypeScript:**
- Path alias: `@/*` maps to project root
- Target: ES2017
- Strict mode enabled
- React JSX mode: react-jsx

**Build:**
- Output: `.next/` directory
- Build command: `next build --webpack` (using Webpack, not Turbopack, due to PWA plugin)
- Static export: None (server-side rendering enabled)

**PWA (Progressive Web App):**
- Workbox configuration in `next.config.ts`
- Offline cache strategy: NetworkFirst with 3-second timeout
- Max cached entries: 200
- Cache age: 24 hours
- Disabled in development mode

## Dev Dependencies

**Code Quality:**
- eslint 9.x - JavaScript linting
- eslint-config-next 16.1.3 - Next.js ESLint configuration
- TypeScript 5.x - Type checking

**Tooling:**
- @types/node 20.x - Node.js type definitions
- @types/react 19.x - React type definitions
- @types/react-dom 19.x - React DOM type definitions
- shadcn 3.7.0 - CLI for managing shadcn/ui components

## Platform Requirements

**Development:**
- Node.js 18+ (required by Next.js 16.1.3)
- npm or compatible package manager

**Production:**
- Deployment target: Vercel (native support for Next.js)
- Alternative: Any Node.js-compatible hosting (Node 18+)
- Database: PostgreSQL (via Supabase)
- Static assets: Next.js internal or CDN

**Browser Support:**
- Modern browsers with ES2017 support
- PWA support for offline functionality

---

*Stack analysis: 2026-01-25*
