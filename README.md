# Finauraa

AI-powered personal finance app for Bahrain with Open Banking integration.

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 16.1.3 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 |
| UI Components | shadcn/ui + Radix UI |
| Database | Supabase (PostgreSQL + RLS) |
| Authentication | Supabase Auth |
| AI | Claude API (Anthropic SDK v0.71.2) |
| Payments | Stripe v20.2.0 |
| Open Banking | Tarabut Gateway |
| Email | Resend v6.8.0 |
| Hosting | Vercel |

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

Copy `.env.example` to `.env.local` and fill in the required values:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Anthropic (Claude AI)
ANTHROPIC_API_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRO_PRICE_ID_MONTHLY=
STRIPE_PRO_PRICE_ID_YEARLY=

# Tarabut Gateway
TARABUT_CLIENT_ID=
TARABUT_CLIENT_SECRET=

# Resend
RESEND_API_KEY=
EMAIL_FROM=

# Cron Jobs
CRON_SECRET=
```

## Documentation

| Document | Description |
|----------|-------------|
| [Architecture](docs/ARCHITECTURE.md) | **Complete technical reference** - pages, components, API, database, AI implementation, design patterns |
| [Business Plan](docs/BUSINESS_PLAN.md) | Market analysis, revenue projections, go-to-market strategy |
| [Pricing](docs/PRICING.md) | Plan features, cost analysis, profitability |
| [Compliance](docs/Openbanking_audit.md) | BOBF/PDPL compliance checklist and implementation status |

## Project Overview

| Category | Count |
|----------|-------|
| Pages | 20 |
| Components | ~110 |
| API Endpoints | 60+ |
| Database Tables | 21 |
| Custom Hooks | 10 |
| AI Rich Cards | 13 |
| Dialogs/Sheets | 18 |

## Project Structure

```
app/
├── api/                 # 60+ API routes
│   ├── chat/           # AI conversation
│   ├── finance/        # Accounts, transactions, budgets, goals
│   ├── family/         # Family group management
│   ├── subscription/   # Stripe billing
│   └── cron/           # Scheduled jobs
├── dashboard/          # Dashboard pages
│   ├── accounts/       # Bank accounts
│   ├── transactions/   # Transaction history
│   ├── spending/       # Spending analysis (My/Family)
│   ├── goals/          # Savings goals
│   └── settings/       # User settings
└── (auth)/             # Login/signup

components/
├── chat/
│   ├── cards/          # 13 AI rich content cards
│   └── *.tsx           # Chat interface components
├── dashboard/          # 16 dashboard components
├── dialogs/            # 8 dialog components
├── sheets/             # 7 sheet components
└── ui/                 # 30+ shadcn/ui components

lib/
├── ai/                 # AI context & privacy functions
├── supabase/           # Database client
├── types.ts            # Core TypeScript types
├── utils.ts            # Utility functions
├── date-utils.ts       # Date formatting
├── features.ts         # Feature gating & tier limits
├── audit.ts            # Audit logging
└── consent-middleware.ts # Consent verification

hooks/                  # 10 custom React hooks
docs/                   # Documentation
supabase/migrations/    # Database migrations
```

## Key Features

### AI Chat Interface
- Conversational finance assistant powered by Claude AI
- 13 rich content card types (balances, spending, budgets, goals, etc.)
- Privacy-first mode (default) or Enhanced AI mode (Pro)

### Banking
- Open Banking via Tarabut Gateway
- Multi-bank support (Bahraini banks)
- Transaction categorization
- Balance tracking

### Financial Management
- Spending analysis by category
- Budget tracking with alerts
- Savings goals with progress
- Financial health score (A-F grade)
- Cash flow analysis
- Recurring expense detection

### Family Sharing (Pro)
- Up to 5 family members
- Shared spending visibility
- Family budgets and goals
- Individual consent controls

### Compliance (BOBF/PDPL)
- Consent management with audit trail
- Data export (PDPL portability)
- Data deletion requests
- 7-year audit log retention

## Plans

| Feature | Free | Pro |
|---------|------|-----|
| Bank Connections | 3 | Unlimited |
| AI Queries/month | 5 | Unlimited |
| Transaction History | 30 days | Unlimited |
| Savings Goals | 3 | Unlimited |
| Spending Limits | 2 | Unlimited |
| Sync Frequency | Manual | Daily Auto |
| Data Export | - | CSV & PDF |
| Family Members | - | Up to 5 |
| Enhanced AI | - | ✓ |
| Budget Alerts | - | ✓ |

**Pro: $7.99/month** or **$79.99/year** (17% savings)

## Design Patterns

### Content Width
- `max-w-2xl` - List pages, settings
- `max-w-4xl` - Dashboard, analytics

### Grid Layout (60/40 Split)
```tsx
<div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
  <div className="lg:col-span-3">Left (60%)</div>
  <div className="lg:col-span-2">Right (40%)</div>
</div>
```

### Skeleton Loaders
- Page-level: Pulse dots
- Component-level: Match actual content structure

See [ARCHITECTURE.md](docs/ARCHITECTURE.md) for complete design patterns and implementation details.

## License

Private - All rights reserved
