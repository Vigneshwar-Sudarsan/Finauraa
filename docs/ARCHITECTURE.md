# Finauraa Architecture Documentation

A comprehensive guide to the Finauraa codebase for developers.

---

## Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Pages](#pages)
4. [Components](#components)
5. [AI Rich Content Cards](#ai-rich-content-cards)
6. [Dialogs, Sheets & Modals](#dialogs-sheets--modals)
7. [API Reference](#api-reference)
8. [Database Schema](#database-schema)
9. [AI Privacy Implementation](#ai-privacy-implementation)
10. [Hooks](#hooks)
11. [Types](#types)
12. [Design Patterns](#design-patterns)
13. [File Structure](#file-structure)

---

## Overview

Finauraa is a personal finance management application built with Next.js 14 (App Router), featuring:
- AI-powered financial insights via conversational chat interface
- Open Banking integration for bank account connections (Tarabut Gateway)
- Budget tracking, spending analysis, and savings goals
- Family plan support for shared financial management
- BOBF/PDPL compliance for Bahrain market

---

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
| Icons | Phosphor Icons |
| State Management | Zustand v5 |
| Payments | Stripe v20.2.0 |
| Open Banking | Tarabut Gateway |
| Email | Resend v6.8.0 |
| Error Tracking | Sentry v10.35.0 |

---

## Pages

**Total: 20 pages**

### Main Application Pages

| Page | Path | Description | Content Width |
|------|------|-------------|---------------|
| AI Chat | `/` | Main AI chat interface | `max-w-2xl` |
| Dashboard | `/dashboard` | Redirects to Accounts | `max-w-4xl` |
| Accounts | `/dashboard/accounts` | Bank accounts overview | `max-w-4xl` |
| Account Detail | `/dashboard/accounts/[accountId]` | Single account view | `max-w-4xl` |
| Transactions | `/dashboard/transactions` | Transaction history | `max-w-2xl` |
| Spending | `/dashboard/spending` | Spending analysis (My/Family tabs) | `max-w-4xl` |
| Goals | `/dashboard/goals` | Savings goals tracker | `max-w-2xl` |
| Payments | `/dashboard/payments` | Payment management | `max-w-2xl` |

### Settings Pages

| Page | Path | Description | Content Width |
|------|------|-------------|---------------|
| Settings | `/dashboard/settings` | Settings overview | `max-w-2xl` |
| Profile | `/dashboard/settings/profile` | User profile management | `max-w-2xl` |
| Security | `/dashboard/settings/security` | Password & security | `max-w-2xl` |
| Notifications | `/dashboard/settings/notifications` | Notification preferences | `max-w-2xl` |
| Connected Banks | `/dashboard/settings/connected-banks` | Manage bank connections | `max-w-2xl` |
| AI Privacy | `/dashboard/settings/ai-privacy` | AI data sharing settings | `max-w-2xl` |
| Privacy | `/dashboard/settings/privacy` | Privacy policy | `max-w-2xl` |
| Subscription | `/dashboard/settings/subscription` | Current plan details | `max-w-2xl` |
| Plans | `/dashboard/settings/subscription/plans` | Upgrade plans | `max-w-4xl` |
| Family | `/dashboard/settings/family` | Family group management | `max-w-2xl` |

### Auth Pages

| Page | Path | Description |
|------|------|-------------|
| Login | `/login` | User authentication |
| Signup | `/signup` | New user registration |

---

## Components

**Total: ~110 components**

### Dashboard Components (`components/dashboard/`)

| Component | File | Description |
|-----------|------|-------------|
| AccountsContent | `accounts-content.tsx` | Accounts list with balance cards |
| AccountDetailContent | `account-detail-content.tsx` | Single account transactions |
| AccountTabs | `account-tabs.tsx` | Tab navigation for accounts |
| BankSelector | `bank-selector.tsx` | Bank selection dropdown |
| ConnectionsList | `connections-list.tsx` | Connected banks management |
| DashboardContent | `dashboard-content.tsx` | Main dashboard container |
| DashboardBottomNav | `dashboard-bottom-nav.tsx` | Mobile bottom navigation |
| DashboardHeader | `dashboard-header.tsx` | Page header with title |
| FamilySpendingContent | `family-spending-content.tsx` | Family tab spending view |
| GoalsContent | `goals-content.tsx` | Savings goals management |
| SpendingContent | `spending-content.tsx` | Personal spending analysis |
| SpendingSummary | `spending-summary.tsx` | Spending overview card |
| SubscriptionContent | `subscription-content.tsx` | Current subscription details |
| TransactionsContent | `transactions-content.tsx` | Transactions list page |
| TransactionsList | `transactions-list.tsx` | Transaction rows component |
| UpgradePlansContent | `upgrade-plans-content.tsx` | Plan comparison cards |

### Chat Components (`components/chat/`)

| Component | File | Description |
|-----------|------|-------------|
| ChatContainer | `chat-container.tsx` | Main chat wrapper |
| ChatHeader | `chat-header.tsx` | Chat page header |
| ChatInput | `chat-input.tsx` | Message input with suggestions |
| ChatMessage | `chat-message.tsx` | Individual message bubble |
| ConversationHistoryDrawer | `conversation-history-drawer.tsx` | Past conversations |
| QuickActions | `quick-actions.tsx` | Preset action buttons |
| RichContent | `rich-content.tsx` | Rich content card renderer |

### UI Components (`components/ui/`)

All shadcn/ui components plus custom additions:
- `button.tsx`, `card.tsx`, `dialog.tsx`, `sheet.tsx`
- `sidebar.tsx` - Custom sidebar with collapsible rail
- `loading-button.tsx` - Button with loading state
- `badge.tsx`, `avatar.tsx`, `progress.tsx`
- And 30+ more shadcn primitives

---

## AI Rich Content Cards

**Total: 13 card types**

The AI chat interface renders rich, interactive cards based on message content. All cards are located in `components/chat/cards/`.

### Card Types Overview

| Type | Component | API | Description |
|------|-----------|-----|-------------|
| `balance-card` | `balance-card.tsx` | `/api/finance/summary` | Total account balance |
| `bank-connected` | `bank-connected.tsx` | - | Bank connection confirmation |
| `spending-analysis` | `spending-analysis.tsx` | `/api/finance/spending` | Category breakdown |
| `budget-card` | `budget-card.tsx` | - | Individual budget display/setup |
| `budget-overview` | `budget-overview.tsx` | `/api/finance/budgets` | All budgets summary |
| `transactions-list` | `transactions-list.tsx` | `/api/finance/transactions` | Recent transactions |
| `cash-flow` | `cash-flow.tsx` | `/api/finance/cash-flow` | Income vs expenses |
| `savings-goals` | `savings-goals.tsx` | `/api/finance/savings-goals` | Goals progress |
| `savings-goal-setup` | `savings-goal-setup.tsx` | - | Goal creation preview |
| `recurring-expenses` | `recurring-expenses.tsx` | `/api/finance/recurring` | Subscriptions/bills |
| `financial-health` | `financial-health.tsx` | `/api/finance/health` | Health score card |
| `action-buttons` | `action-buttons.tsx` | - | Generic action group |
| `ai-mode-intro` | `ai-mode-intro.tsx` | - | Privacy/Enhanced mode selection |

### Card Data Structures

```typescript
// Balance Card
type: "balance-card"
data: { balance?: number; accountCount?: number; currency?: string; }

// Spending Analysis
type: "spending-analysis"
data: {
  totalSpent?: number;
  currency?: string;
  period?: string;
  categories?: Array<{ category: string; amount: number; percentage: number; }>;
  topCategory?: string;
}

// Cash Flow
type: "cash-flow"
data: {
  monthlyIncome?: number;
  monthlyExpenses?: number;
  netCashFlow?: number;
  savingsRate?: number;
  billsDue?: Array<{ name: string; amount: number; dueDate: string; }>;
}

// Financial Health
type: "financial-health"
data: {
  score?: number;  // 0-100
  grade?: "A" | "B" | "C" | "D" | "F";
  factors?: {
    savingsRate: { score: number; value: number; status: "good" | "warning" | "critical" };
    budgetAdherence: { score: number; value: number; status: string };
    emergencyFund: { score: number; months: number; status: string };
    spendingStability: { score: number; volatility: number; status: string };
  };
}
```

### Rich Content Renderer

```typescript
interface RichContentProps {
  content: MessageContent;
  onAction?: (action: string, data?: Record<string, unknown>) => void;
  disabled?: boolean;
}
```

All cards support: `onAction` callback, `disabled` state, skeleton loaders, empty states.

---

## Dialogs, Sheets & Modals

**Total: 18 dialogs/sheets**

### Dialogs (`components/dialogs/`)

| Dialog | File | Trigger |
|--------|------|---------|
| AddBudgetDialog | `add-budget-dialog.tsx` | Create new budget |
| AddSavingsGoalDialog | `add-savings-goal-dialog.tsx` | Create savings goal |
| DeleteAccountDialog | `delete-account-dialog.tsx` | Confirm account deletion |
| DisconnectBankDialog | `disconnect-bank-dialog.tsx` | Confirm bank disconnect |
| InviteFamilyMemberDialog | `invite-family-member-dialog.tsx` | Send family invite |
| RemoveFamilyMemberDialog | `remove-family-member-dialog.tsx` | Remove member |
| SetBudgetDialog | `set-budget-dialog.tsx` | Quick budget setup |
| TransactionDetailDialog | `transaction-detail-dialog.tsx` | Transaction details |

### Sheets (`components/sheets/`)

| Sheet | File | Description |
|-------|------|-------------|
| BankConnectionSheet | `bank-connection-sheet.tsx` | Bank linking flow |
| BudgetSheet | `budget-sheet.tsx` | Edit budget details |
| FamilyGroupSheet | `family-group-sheet.tsx` | Family management |
| SavingsGoalSheet | `savings-goal-sheet.tsx` | Goal creation/edit |
| SettingsSheet | `settings-sheet.tsx` | Quick settings |
| SubscriptionSheet | `subscription-sheet.tsx` | Plan details |
| TransactionFiltersSheet | `transaction-filters-sheet.tsx` | Filter transactions |

---

## API Reference

**Total: 60+ endpoints** | Authentication: Supabase Auth (JWT in cookies)

### Chat API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/chat` | POST | Send message to AI assistant |
| `/api/conversations` | GET/POST | List/create conversations |
| `/api/conversations/[id]` | GET/DELETE | Get/archive conversation |
| `/api/conversations/[id]/messages` | GET | Get messages |

**POST /api/chat Request:**
```json
{ "message": "How much did I spend on groceries?", "conversationId": "uuid" }
```
**Response:**
```json
{
  "response": "Based on your transactions...",
  "richContent": [{ "type": "spending-analysis", "data": {...} }],
  "conversationId": "uuid"
}
```

### Finance - Accounts

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/finance/accounts` | GET | List all bank accounts |
| `/api/finance/accounts/[id]` | GET | Get account with transactions |
| `/api/finance/connections` | GET | List bank connections |
| `/api/finance/connections/[id]` | DELETE | Disconnect a bank |
| `/api/finance/connections/disconnect-all` | POST | Disconnect all banks |
| `/api/finance/refresh` | POST | Manually sync bank data |

### Finance - Transactions

| Endpoint | Method | Query Params |
|----------|--------|--------------|
| `/api/finance/transactions` | GET | `account_id`, `category`, `start_date`, `end_date`, `limit`, `offset`, `type` |
| `/api/finance/transactions/manual` | POST | Add manual transaction |

### Finance - Budgets & Goals

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/finance/budgets` | GET/POST/PUT/DELETE | Budget CRUD |
| `/api/finance/savings-goals` | GET/POST/PUT/DELETE | Goals CRUD |
| `/api/finance/savings-goals/[id]/contribute` | POST | Add contribution |

### Finance - Insights

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/finance/summary` | GET | Financial summary dashboard |
| `/api/finance/spending` | GET | Spending by category |
| `/api/finance/health` | GET | Financial health score |
| `/api/finance/cash-flow` | GET | Cash flow analysis |
| `/api/finance/recurring` | GET | Recurring expenses |
| `/api/finance/insights/balance-history` | GET | Balance over time |
| `/api/finance/insights/income` | GET | Income analysis |
| `/api/finance/insights/salary` | GET | Salary detection |

### Family API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/family/group` | GET/POST/PUT | Family group CRUD |
| `/api/family/group/transfer-ownership` | POST | Transfer ownership |
| `/api/family/members` | GET | List members |
| `/api/family/members/invite` | POST | Send invitation |
| `/api/family/members/[id]` | DELETE | Remove member |
| `/api/family/invitations/[token]` | GET/POST | Accept/decline invite |
| `/api/finance/family/spending` | GET | Family spending (Pro) |
| `/api/finance/family/budgets` | GET/POST/PUT | Family budgets |
| `/api/finance/family/consent` | GET/POST | Spending consent |

### Subscription API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/subscription` | GET | Current subscription status |
| `/api/subscription/checkout` | POST | Create Stripe checkout |
| `/api/subscription/portal` | GET | Stripe customer portal URL |
| `/api/subscription/cancel` | POST | Cancel subscription |
| `/api/subscription/change-plan` | POST | Switch monthly/annual |
| `/api/subscription/sync` | POST | Sync status from Stripe |

### User & Consent API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/user/profile` | GET/PUT | User profile |
| `/api/user/ai-mode` | GET/POST | AI privacy mode |
| `/api/user/data-export` | GET/POST | PDPL data export |
| `/api/consents` | GET/POST | List/create consents |
| `/api/consents/[id]` | GET/DELETE | Get/revoke consent |

### Cron Jobs (Vercel Cron)

| Endpoint | Schedule | Description |
|----------|----------|-------------|
| `/api/cron/expire-consents` | Daily 00:00 UTC | Mark expired consents |
| `/api/cron/data-retention` | Daily 01:00 UTC | Data cleanup |

### Rate Limits

| Endpoint Type | Free | Pro |
|---------------|------|-----|
| AI Chat | 5/month | Unlimited |
| General API | 60/min | 120/min |
| Data Export | 1/day | 5/day |
| Family Invites | 3/day | 10/day |

---

## Database Schema

**Total: 21 tables** | All tables have Row Level Security (RLS) enabled

### Core Tables

#### profiles
User accounts linked to Supabase Auth.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key (references auth.users) |
| email | text | User email |
| full_name | text | Display name |
| subscription_tier | text | `free` / `pro` / `family` |
| subscription_status | text | `active` / `canceled` / `past_due` / `trialing` |
| stripe_customer_id | text | Stripe customer reference |
| ai_data_mode | text | `privacy-first` / `enhanced` |
| enhanced_ai_consent_given_at | timestamptz | When AI consent was given |
| family_group_id | uuid | FK to family_groups |
| is_admin | boolean | Admin access for feature flags |

### Banking Tables

#### bank_connections
Connected bank accounts via Tarabut Gateway.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | FK to auth.users |
| bank_id | text | Bank identifier |
| bank_name | text | Bank display name |
| consent_id | text | Tarabut consent ID |
| status | text | `pending` / `active` / `expired` / `revoked` |
| consent_expires_at | timestamptz | Consent expiration |
| deleted_at | timestamptz | Soft delete timestamp |

#### bank_accounts

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| connection_id | uuid | FK to bank_connections |
| account_type | text | checking, savings, etc. |
| account_number | text | Masked account number |
| balance | numeric | Current balance |
| currency | text | Default: `BHD` |

#### transactions

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| account_id | uuid | FK to bank_accounts |
| amount | numeric | Transaction amount |
| transaction_type | text | `credit` / `debit` |
| merchant_name | text | Merchant name |
| category | text | Spending category |
| transaction_date | timestamptz | Transaction date |
| transaction_scope | text | `personal` / `family` / `auto` |
| is_anonymized | boolean | Data anonymized |

### Finance Tables

#### budgets

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | FK to auth.users |
| category | text | Budget category |
| amount | numeric | Budget limit |
| period | text | `weekly` / `monthly` / `yearly` |
| scope | text | `personal` / `family` |
| family_group_id | uuid | FK to family_groups |

#### savings_goals

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | FK to auth.users |
| name | text | Goal name |
| target_amount | numeric | Target to save |
| current_amount | numeric | Amount saved |
| target_date | date | Goal deadline |
| is_completed | boolean | Goal achieved |

### Family Tables

#### family_groups

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| owner_id | uuid | FK to auth.users (owner) |
| name | text | Group name |

#### family_members

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| group_id | uuid | FK to family_groups |
| user_id | uuid | FK to auth.users (null for pending) |
| email | text | Invitation email |
| role | text | `owner` / `admin` / `member` |
| status | text | `pending` / `active` / `removed` |
| invitation_token | text | Unique token for invite link |
| spending_consent_given | boolean | Consent to share spending |

### Compliance Tables (BOBF/PDPL)

#### user_consents
Consent tracking for data access.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | FK to profiles |
| consent_type | text | `bank_access` / `ai_data` / `marketing` |
| permissions_granted | text[] | Array of permissions |
| consent_status | text | `active` / `revoked` / `expired` |
| consent_expires_at | timestamptz | When expires |
| ip_address | inet | User IP |

#### audit_logs
Comprehensive audit trail (7-year retention).

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | FK to profiles |
| action_type | text | Action performed |
| resource_type | text | Resource affected |
| ip_address | inet | Request IP |
| action_timestamp | timestamptz | When occurred |

#### data_export_requests / data_deletion_requests
PDPL data portability and erasure requests.

### Admin Tables

#### feature_flags
Dynamic feature configuration per tier.

| Column | Type | Description |
|--------|------|-------------|
| feature_key | text | Unique feature identifier |
| category | text | `usage_limit` / `boolean_feature` / `notification` / `ai` |
| free_value | jsonb | Value for free tier |
| pro_value | jsonb | Value for pro tier |

---

## AI Privacy Implementation

### Two AI Modes

| Mode | Default | Data Sent | Availability |
|------|---------|-----------|--------------|
| **Privacy-First** | Yes | Anonymized only | All users |
| **Enhanced AI** | No | Full financial data | Pro (with consent) |

### Privacy-First Mode (Default)

Data sent to AI:
- **Balance Level**: "low" / "medium" / "high" / "very_high"
- **Spending Trend**: "below_average" / "average" / "above_average"
- **Top Categories**: By frequency, not amount
- **Budget Status**: Category names only

Data NOT sent: Exact amounts, merchant names, account numbers, specific dates.

### Balance Thresholds (BHD)

| Level | Balance Range |
|-------|---------------|
| low | < 500 BHD |
| medium | 500 - 2,000 BHD |
| high | 2,000 - 10,000 BHD |
| very_high | > 10,000 BHD |

### Enhanced AI Mode (Pro Only)

Requirements:
1. Active Pro subscription
2. Explicit consent via two-checkbox dialog
3. Consent timestamp + IP recorded

Data sent: Accounts with balances, last 100 transactions, budgets, savings goals, cash flow.

### Response Examples

| Question | Privacy-First | Enhanced AI |
|----------|--------------|-------------|
| "How much on groceries?" | "Check your dashboard" | "287.500 BHD last week" |
| "Can I afford 50 BHD?" | "Check your budget page" | "Yes! 75.250 BHD remaining" |
| "What's my balance?" | "Your balance is healthy" | "2,450.750 BHD total" |

### Key Files

| File | Purpose |
|------|---------|
| `lib/ai/data-privacy.ts` | Context generation for both modes |
| `lib/ai/finance-manager.ts` | AI context formatting |
| `app/api/user/ai-mode/route.ts` | Mode switching API |
| `components/settings/ai-privacy-settings.tsx` | Settings UI |
| `components/settings/enhanced-ai-consent-dialog.tsx` | Consent dialog |

---

## Hooks

### Custom Hooks (`hooks/`)

| Hook | File | Description |
|------|------|-------------|
| useUser | `use-user.ts` | Current user state |
| useSubscription | `use-subscription.ts` | Subscription status |
| useBankAccounts | `use-bank-accounts.ts` | Connected accounts |
| useTransactions | `use-transactions.ts` | Transaction data |
| useBudgets | `use-budgets.ts` | Budget management |
| useSavingsGoals | `use-savings-goals.ts` | Goals data |
| useSpending | `use-spending.ts` | Spending analysis |
| useFamilyGroup | `use-family-group.ts` | Family management |
| useMediaQuery | `use-media-query.ts` | Responsive detection |
| useDialogForm | `use-dialog-form.ts` | Dialog form state |

---

## Types

### Core Types (`lib/types.ts`)

```typescript
// Message types
type MessageRole = "user" | "assistant";
type MessageContentType =
  | "text" | "balance-card" | "bank-connected"
  | "spending-analysis" | "budget-card" | "budget-overview"
  | "transactions-list" | "action-buttons" | "ai-mode-intro"
  | "financial-health" | "cash-flow" | "savings-goals"
  | "savings-goal-setup" | "recurring-expenses";

interface Message {
  id: string;
  role: MessageRole;
  content: string;
  richContent?: MessageContent[];
  timestamp: Date;
  actionsDisabled?: boolean;
}

// Family types
type FamilyMemberRole = "owner" | "admin" | "member";
type FamilyMemberStatus = "pending" | "active" | "removed";
```

---

## Design Patterns

### 1. Layout Pattern

```tsx
<SidebarProvider>
  <AppSidebar className="hidden md:flex" />
  <SidebarInset>
    <main className="pb-16 md:pb-0">
      <Suspense fallback={<Loading />}>
        <Content />
      </Suspense>
    </main>
    <DashboardBottomNav />
  </SidebarInset>
</SidebarProvider>
```

### 2. Content Width Classes

| Width | Usage |
|-------|-------|
| `max-w-2xl` | List pages, settings |
| `max-w-4xl` | Dashboard, analytics |
| `max-w-sm` | Chat cards |

### 3. Grid Layouts (60/40 Split)

```tsx
<div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
  <div className="lg:col-span-3">Left (60%)</div>
  <div className="lg:col-span-2">Right (40%)</div>
</div>
```

### 4. Skeleton Loaders

**Page-level:** Pulse dots
```tsx
<div className="flex items-center gap-2">
  <div className="size-2 bg-foreground/40 rounded-full animate-pulse" />
  <div className="size-2 bg-foreground/40 rounded-full animate-pulse" style={{ animationDelay: "150ms" }} />
  <div className="size-2 bg-foreground/40 rounded-full animate-pulse" style={{ animationDelay: "300ms" }} />
</div>
```

**Component-level:** Match actual content structure

### 5. Currency & Date Formatting

```typescript
import { formatCurrency } from "@/lib/utils";
formatCurrency(100, "BHD") // "BHD 100.000"

import { formatDate, formatTransactionDate } from "@/lib/date-utils";
formatDate("2024-01-15", "monthYear") // "January 2024"
formatTransactionDate("2024-01-15") // "Jan 15" or "Today"
```

---

## File Structure

```
finauraa/
├── app/
│   ├── (auth)/login/, signup/
│   ├── dashboard/
│   │   ├── accounts/, transactions/, spending/, goals/, payments/
│   │   └── settings/
│   │       ├── profile/, security/, connected-banks/, ai-privacy/
│   │       ├── subscription/, family/, privacy/
│   ├── api/
│   │   ├── auth/, chat/, finance/, family/, subscription/
│   │   ├── consents/, user/, cron/, webhooks/
│   └── page.tsx (AI Chat)
├── components/
│   ├── chat/
│   │   ├── cards/ (13 rich content cards)
│   │   ├── chat-container.tsx, chat-input.tsx, chat-message.tsx
│   │   └── rich-content.tsx
│   ├── dashboard/ (16 components)
│   ├── dialogs/ (8 dialogs)
│   ├── sheets/ (7 sheets)
│   └── ui/ (30+ shadcn components)
├── hooks/ (10 custom hooks)
├── lib/
│   ├── ai/ (data-privacy.ts, finance-manager.ts)
│   ├── supabase/
│   ├── types.ts, utils.ts, date-utils.ts
│   ├── audit.ts, consent-middleware.ts, ratelimit.ts
├── docs/
└── public/
```

---

## Quick Reference

### Adding a New Rich Content Card

1. Create component in `components/chat/cards/`
2. Add type to `MessageContentType` in `lib/types.ts`
3. Add case to switch in `components/chat/rich-content.tsx`
4. Define data structure and API endpoint if needed

### Adding a New Page

1. Create page in `app/` directory
2. Follow layout pattern with SidebarProvider
3. Add to navigation in `app-sidebar.tsx` and `dashboard-bottom-nav.tsx`
4. Use appropriate content width class

### Adding a New Dialog

1. Create in `components/dialogs/`
2. Use shadcn Dialog component
3. Handle form state with `use-dialog-form.ts` hook

---

*Last updated: January 2026*
