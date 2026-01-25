# Finauraa Business Plan

> AI-First Personal Finance App for Bahrain

---

## Executive Summary

Finauraa is an AI-powered personal finance application designed specifically for Bahrain's market. Using Tarabut Gateway's Open Banking APIs and Claude AI, Finauraa helps users track spending, manage budgets, and improve their financial health through natural conversation.

**Key Differentiators:**
- Conversational-first interface (70% chat, 30% dashboard)
- Bahrain-focused with BHD currency and local banks
- Privacy-first AI architecture with optional enhanced mode
- Open Banking integration via Tarabut Gateway
- Family sharing built into Pro tier

---

## Market Opportunity

### Bahrain Market Size
- Population: ~1.5 million
- Banked population: ~85%
- Smartphone penetration: ~95%
- Target addressable market: ~500,000 potential users

### Problem Statement
1. No local budgeting apps designed for Bahrain
2. Users manage multiple bank accounts manually
3. Lack of spending insights in local banking apps
4. Financial planning tools are complex and intimidating

### Solution
An AI assistant that makes personal finance as easy as having a conversation.

---

## Product Overview

### Core Features

| Feature | Free | Pro |
|---------|------|-----|
| AI Financial Assistant | 5/month | Unlimited |
| Bank Connections | 3 | Unlimited |
| Transaction History | 30 days | Unlimited |
| Savings Goals | 3 | Unlimited |
| Spending Limits | 2 | Unlimited |
| Sync Frequency | Manual | Auto (daily) |
| Spending Insights | Basic | Advanced |
| Enhanced AI Mode | - | ✅ (with consent) |
| Budget Alerts | - | ✅ |
| Data Export | - | CSV & PDF |
| Family Members | - | Up to 5 |
| Family Dashboard | - | ✅ |

### User Experience
- **Conversational-first**: Users interact primarily through chat
- **Proactive insights**: AI surfaces important information automatically
- **Minimal cognitive load**: Clean, simple interface
- **Progressive onboarding**: Connect bank through natural conversation

### AI Privacy Modes
1. **Privacy-First (Default)**: Anonymized data only
   - Balance shown as "low/medium/high/very_high"
   - Spending trend as "below/average/above average"
   - No exact amounts sent to AI

2. **Enhanced AI (Pro only)**: Full data with consent
   - Exact balances and amounts
   - Merchant-level analysis
   - Specific budget recommendations
   - Requires explicit user consent

---

## Pricing Strategy

### Free Plan - $0/month
**Purpose:** User acquisition, market penetration

**Includes:**
- 3 bank connections
- 5 AI queries per month
- 30 days transaction history
- 3 savings goals
- 2 spending limits
- Manual sync only
- Basic spending insights

**Limitations:**
- No budgets/budget alerts
- No data export
- No family sharing
- No enhanced AI

### Pro Plan - $7.99/month
**Purpose:** Revenue generation, power users

**Includes:**
- Unlimited bank connections
- Unlimited AI queries
- Full transaction history
- Unlimited savings goals
- Unlimited spending limits
- Auto daily sync
- Advanced spending insights
- Enhanced AI mode (with consent)
- Unlimited budgets
- Budget alerts & notifications
- Export to CSV/PDF
- Up to 5 family members
- Family dashboard
- Shared goals & budgets
- Priority support

**Annual: $79.99/year** (17% savings, ~$6.67/month)

---

## Revenue Model

### Assumptions
- Launch target: 1,000 users in first 6 months
- Free to Pro conversion: 5-10%
- Pro user retention: 6 months average
- Growth rate: 20% month-over-month after launch

### Year 1 Projections

| Month | Total Users | Free | Pro | Monthly Revenue |
|-------|-------------|------|-----|-----------------|
| 1 | 500 | 475 | 25 | $200 |
| 3 | 1,000 | 925 | 75 | $600 |
| 6 | 2,500 | 2,250 | 250 | $2,000 |
| 12 | 8,000 | 7,200 | 800 | $6,400 |

**Year 1 Total Revenue: ~$25,000-35,000**

### Year 2 Projections

| Month | Total Users | Free | Pro | Monthly Revenue |
|-------|-------------|------|-----|-----------------|
| 18 | 20,000 | 18,000 | 2,000 | $16,000 |
| 24 | 50,000 | 45,000 | 5,000 | $40,000 |

**Year 2 Total Revenue: ~$250,000-350,000**

---

## Cost Structure

### AI Costs (Claude 3.5 Sonnet)

**Per Query Cost:**
```
Input:  850 tokens  × $3/1M   = $0.00255
Output: 200 tokens  × $15/1M  = $0.00300
Total per query:              ≈ $0.0055
```

**Monthly AI Costs by User Type:**
| User Type | Queries/Month | Cost/User |
|-----------|---------------|-----------|
| Free | 5 (capped) | $0.03 |
| Pro | ~150 (avg) | $0.75 |

### Infrastructure Costs

| Item | Monthly Cost |
|------|--------------|
| Supabase (Pro) | $25 |
| Vercel (Pro) | $20 |
| Resend (Email) | $20 |
| Domain & SSL | ~$2 |
| **Total Infrastructure** | **~$67/month** |

### Profit Margins

| Tier | Price | Costs | Profit | Margin |
|------|-------|-------|--------|--------|
| Free | $0 | ~$0.20 | -$0.20 | -100% |
| Pro Monthly | $7.99 | ~$2.38 | ~$5.61 | ~70% |
| Pro Annual | $79.99 | ~$12.82 | ~$67.17 | ~84% |

---

## Technology Stack

### Frontend
- Next.js 16.1.3 (App Router)
- React 19.2.3
- Tailwind CSS 4
- shadcn/ui components
- Radix UI primitives
- Zustand (state management)

### Backend
- Next.js API Routes (60+ endpoints)
- Supabase (PostgreSQL + Auth + RLS)
- Vercel Cron Jobs (consent expiry, data retention)

### External Services
- **Tarabut Gateway**: Open Banking (Connect, Categorisation)
- **Claude API**: AI conversations (Anthropic SDK v0.71.2)
- **Stripe**: Subscription billing (v20.2.0)
- **Resend**: Transactional emails (v6.8.0)
- **Sentry**: Error tracking & monitoring

### Infrastructure
- Vercel (hosting + cron jobs)
- Supabase (database + auth + RLS)
- PWA support (installable app)

---

## Key Features Implemented

### Chat & AI
- Conversational finance assistant with Claude AI
- Privacy-first mode (anonymized data)
- Enhanced AI mode (full data with consent)
- Rich content cards (balances, budgets, goals, transactions)
- Financial health scoring (0-100 with A-F grades)
- Cash flow predictions
- Recurring expense detection

### Banking Integration
- Tarabut Gateway Open Banking
- Multi-bank support (Bahraini banks)
- Account sync (manual/daily auto)
- Transaction categorization
- Balance history tracking

### Budgeting & Goals
- Category-based budgets
- Budget alerts at 85% and 100%
- Savings goals with progress tracking
- Goal contributions
- AI-powered recommendations

### Family Features (Pro)
- Up to 5 family members
- Family dashboard
- Shared spending visibility
- Shared goals and budgets
- Individual consent controls

### Compliance (Fully Implemented)
- BOBF (Bahrain Open Banking Framework)
- PDPL (Personal Data Protection Law)
- Consent tracking with audit trail
- Data export and deletion requests
- 7-year audit log retention
- Consent expiry notifications (7 days before)
- Automated data retention cleanup (cron jobs)

### Database Tables (21 Tables)
| Category | Tables |
|----------|--------|
| Core | profiles, bank_connections, bank_accounts, transactions |
| Chat | conversations, messages |
| Finance | budgets, savings_goals |
| Family | family_groups, family_members |
| Compliance | user_consents, audit_logs, data_retention_policies, data_export_requests, data_deletion_requests |
| Admin | feature_flags, feature_flag_audit_log, rate_limits, notifications |
| Billing | billing_history |
| Config | merchant_scope_defaults |

---

## Go-to-Market Strategy

### Phase 1: Soft Launch (Month 1-2)
- Launch with invite-only beta
- Target: 100-200 early adopters
- Focus: Bug fixes, UX refinement
- Marketing: None (word of mouth)

### Phase 2: Public Launch (Month 3-4)
- Open registration
- Target: 1,000 users
- Marketing:
  - Social media (Instagram, Twitter)
  - Tech blogs and PR
  - Bahrain fintech community

### Phase 3: Growth (Month 5-12)
- Target: 5,000-10,000 users
- Marketing:
  - Paid social ads (targeted)
  - Influencer partnerships
  - Referral program (1 month Pro free)
  - App Store optimization

### Phase 4: Expansion (Year 2+)
- Expand to UAE, Saudi Arabia, Kuwait
- Partner with banks directly
- B2B offerings (white-label)

---

## Competitive Analysis

| Competitor | Market | Strengths | Weaknesses |
|------------|--------|-----------|------------|
| **Mint** | USA | Established, feature-rich | No Bahrain support |
| **YNAB** | Global | Strong methodology | No Open Banking, manual entry |
| **Emma** | UK/EU | AI insights | No MENA support |
| **Wallet by BudgetBakers** | Global | Multi-currency | No Open Banking in Bahrain |
| **Bank Apps** | Bahrain | Direct access | Single bank, no insights |

**Finauraa's Competitive Advantage:**
1. Only AI-first finance app for Bahrain
2. Native Open Banking via Tarabut
3. Conversational interface (unique UX)
4. Local currency and bank support
5. Privacy-first architecture with optional enhanced mode

---

## Risk Analysis

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Low user adoption | Medium | High | Strong marketing, generous free tier |
| Tarabut API issues | Low | High | Error handling, manual entry fallback |
| AI costs exceed projections | Medium | Medium | Caching, rate limits, model tiering |
| Security breach | Low | Critical | Security audits, encryption, RLS |
| Regulatory changes | Low | Medium | Stay compliant, legal counsel |
| Competition enters market | Medium | Medium | First-mover advantage, UX focus |

---

## Success Metrics (KPIs)

### User Metrics
- Monthly Active Users (MAU)
- Daily Active Users (DAU)
- DAU/MAU ratio (engagement)
- User retention (Day 1, 7, 30)

### Business Metrics
- Free to Pro conversion rate
- Monthly Recurring Revenue (MRR)
- Customer Acquisition Cost (CAC)
- Lifetime Value (LTV)
- LTV:CAC ratio (target: >3:1)

### Product Metrics
- AI queries per user per day
- Bank connection success rate
- Feature adoption rates
- NPS score (target: >50)

---

## Milestones

### Q1 2026
- [x] Project setup and architecture
- [x] MVP development complete
- [x] Tarabut sandbox integration
- [x] BOBF/PDPL compliance implementation
- [x] Family sharing features
- [x] Feature flags admin system
- [x] Email notifications (Resend)
- [x] PWA support
- [ ] Beta launch (100 users)

### Q2 2026
- [ ] Public launch
- [ ] 1,000 users milestone
- [ ] First paying customers
- [ ] Payment Initiation Service (PIS) via Tarabut

### Q3 2026
- [ ] 5,000 users milestone
- [ ] Mobile app consideration
- [ ] Break-even on operational costs

### Q4 2026
- [ ] 10,000 users milestone
- [ ] Business tier consideration
- [ ] UAE expansion planning

---

## Appendix

### A. Bahrain Banking Partners (via Tarabut)
- National Bank of Bahrain (NBB)
- Bank of Bahrain and Kuwait (BBK)
- Ahli United Bank (AUB)
- Kuwait Finance House (KFH)
- Ithmaar Bank
- Bahrain Islamic Bank (BisB)
- Al Salam Bank

### B. Regulatory Compliance
- Central Bank of Bahrain (CBB) Open Banking Framework
- Tarabut Gateway handles regulatory compliance
- PDPL data protection compliance
- User consent required for all data access
- Audit trail for compliance verification

### C. Contact
- Website: finauraa.com
- Email: dev@finauraa.com

---

*Last Updated: January 2026*
