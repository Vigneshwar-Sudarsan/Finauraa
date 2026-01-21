# Finauraa Business Plan

> AI-First Personal Finance App for Bahrain

---

## Executive Summary

Finauraa is an AI-powered personal finance application designed specifically for Bahrain's market. Using Tarabut Gateway's Open Banking APIs and Claude AI, Finauraa helps users track spending, manage budgets, and improve their financial health through natural conversation.

**Key Differentiators:**
- Conversational-first interface (70% chat, 30% dashboard)
- Bahrain-focused with BHD currency and local banks
- Privacy-first AI architecture (aggregated data only)
- Open Banking integration via Tarabut Gateway

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
| AI Financial Assistant | 30 queries/month | Unlimited |
| Bank Connections | 1 bank | Unlimited |
| Transaction History | 30 days | Full history |
| Spending Categories | View only | View + Edit |
| Budgets | - | Unlimited |
| Savings Goals | - | Unlimited |
| Send Money (PIS) | - | Yes |
| Export (CSV/PDF) | - | Yes |
| Monthly Reports | - | Yes |

### User Experience
- **Conversational-first**: Users interact primarily through chat
- **Proactive insights**: AI surfaces important information automatically
- **Minimal cognitive load**: Clean, simple interface
- **Progressive onboarding**: Connect bank through natural conversation

---

## Pricing Strategy

### Free Tier - BHD 0/month
**Purpose:** User acquisition, market penetration

**Includes:**
- Connect 1 bank account
- 30 AI queries per month
- View transactions (30 days)
- Basic spending summary
- Dashboard view

**Limitations:**
- No budgets or goals
- No payment initiation
- No exports
- Limited transaction history

### Pro Tier - BHD 2.900/month (~$7.70 USD)
**Purpose:** Revenue generation, power users

**Includes:**
- Everything in Free, plus:
- Unlimited AI queries
- Unlimited bank connections
- Full transaction history
- Unlimited budgets
- Savings goals with tracking
- Send money via chat (Tarabut PIS)
- Export to CSV/PDF
- Monthly spending reports
- Email support

### Future: Business Tier - BHD 9.900/month (~$26 USD)
**Purpose:** Freelancers, small business owners

**Includes:**
- Everything in Pro, plus:
- Multiple profiles (personal + business)
- Invoice tracking
- Tax category tagging
- Custom reports
- Priority support
- API access

---

## Revenue Model

### Assumptions
- Launch target: 1,000 users in first 6 months
- Free to Pro conversion: 5% (conservative)
- Pro user retention: 6 months average
- Growth rate: 20% month-over-month after launch

### Year 1 Projections

| Month | Total Users | Free (95%) | Pro (5%) | Monthly Revenue |
|-------|-------------|------------|----------|-----------------|
| 1 | 500 | 475 | 25 | BHD 72.50 |
| 3 | 1,000 | 950 | 50 | BHD 145.00 |
| 6 | 2,500 | 2,375 | 125 | BHD 362.50 |
| 12 | 8,000 | 7,600 | 400 | BHD 1,160.00 |

**Year 1 Total Revenue: ~BHD 6,500 (~$17,250 USD)**

### Year 2 Projections (with Business tier)

| Month | Total Users | Free | Pro | Business | Monthly Revenue |
|-------|-------------|------|-----|----------|-----------------|
| 18 | 20,000 | 18,400 | 800 | 200 | BHD 4,300.00 |
| 24 | 50,000 | 46,000 | 2,000 | 500 | BHD 10,750.00 |

**Year 2 Total Revenue: ~BHD 85,000 (~$225,000 USD)**

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
| Free | 30 (capped) | $0.17 |
| Pro | 150 (avg) | $0.83 |
| Business | 300 (avg) | $1.65 |

### Cost Optimization Strategies

1. **Response Caching** (-35% cost)
   - Cache common queries for 1 hour
   - Cache transaction summaries daily

2. **Tiered Models** (-50% cost)
   - Simple queries → Claude Haiku ($0.25/1M)
   - Complex analysis → Claude Sonnet ($3/1M)

3. **Prompt Optimization** (-15% cost)
   - Minimize system prompt tokens
   - Efficient context management

**Optimized Costs:**
| User Type | Before | After Optimization |
|-----------|--------|-------------------|
| Free | $0.17 | $0.05 |
| Pro | $0.83 | $0.25 |
| Business | $1.65 | $0.50 |

### Other Operating Costs

| Item | Monthly Cost |
|------|--------------|
| Supabase (Pro) | $25 |
| Vercel (Pro) | $20 |
| Tarabut API | Variable (per transaction) |
| Domain & SSL | ~$2 |
| **Total Infrastructure** | **~$50/month** |

### Profit Margins (Optimized)

| Tier | Price | AI Cost | Infra (allocated) | Profit | Margin |
|------|-------|---------|-------------------|--------|--------|
| Free | $0 | $0.05 | $0.01 | -$0.06 | -100% |
| Pro | $7.70 | $0.25 | $0.05 | $7.40 | 96% |
| Business | $26 | $0.50 | $0.10 | $25.40 | 98% |

---

## Technology Stack

### Frontend
- Next.js 14 (App Router)
- React 19
- Tailwind CSS
- shadcn/ui components
- Vercel AI SDK

### Backend
- Next.js API Routes
- Supabase (PostgreSQL + Auth)
- Supabase pgvector (AI embeddings)

### External Services
- **Tarabut Gateway**: Open Banking (Connect, Categorisation, Pay)
- **Claude API**: AI conversations (Anthropic)
- **Tap Payments**: Subscription billing (Bahrain-focused)

### Infrastructure
- Vercel (hosting)
- Supabase (database + auth)
- Cloudflare (CDN, optional)

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
5. Privacy-first architecture

---

## Risk Analysis

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Low user adoption | Medium | High | Strong marketing, free tier |
| Tarabut API issues | Low | High | Error handling, manual entry fallback |
| AI costs exceed projections | Medium | Medium | Aggressive caching, model tiering |
| Security breach | Low | Critical | Security audits, encryption, RLS |
| Regulatory changes | Low | Medium | Stay compliant, legal counsel |
| Competition enters market | Medium | Medium | First-mover advantage, UX focus |

---

## Team Requirements

### MVP Launch (Current)
- 1 Full-stack Developer (you)
- Design support (AI-assisted)

### Growth Phase
- 1 Full-stack Developer
- 1 Marketing/Growth hire
- Part-time customer support

### Scale Phase
- 2-3 Developers
- 1 Product Manager
- 1 Marketing Manager
- Customer support team

---

## Funding Requirements

### Bootstrap Phase (Current)
- **Required:** BHD 0 (self-funded development)
- **Timeline:** 3-4 months to MVP

### Seed Phase (Post-Launch)
- **Required:** BHD 20,000-50,000 (~$53,000-$133,000)
- **Use of Funds:**
  - Marketing and user acquisition
  - Hire 1 additional developer
  - Legal and compliance
  - 12-month runway

### Series A (Year 2)
- **Required:** BHD 200,000-500,000 (~$530,000-$1.3M)
- **Use of Funds:**
  - Regional expansion (GCC)
  - Team expansion
  - B2B product development

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
- [ ] MVP development complete
- [ ] Tarabut sandbox integration
- [ ] Beta launch (100 users)

### Q2 2026
- [ ] Public launch
- [ ] 1,000 users milestone
- [ ] Pro tier launch
- [ ] First paying customers

### Q3 2026
- [ ] 5,000 users milestone
- [ ] Payment initiation feature
- [ ] Mobile app (React Native)
- [ ] Break-even on operational costs

### Q4 2026
- [ ] 10,000 users milestone
- [ ] Business tier launch
- [ ] Seed funding round
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
- GDPR-like data protection principles
- User consent required for all data access

### C. Contact
- Website: finauraa.com
- Email: dev@finauraa.com

---

*Last Updated: January 2026*
