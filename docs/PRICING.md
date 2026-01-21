# Finauraa Pricing & Cost Analysis

> Last updated: January 2025
> Currency: BHD (Bahraini Dinar) - 1 USD ≈ 0.376 BHD
> Note: Tarabut Gateway pricing is estimated. Update when actual pricing is confirmed.

## Plan Structure

### Free Plan - 0 BHD/month
| Feature | Limit |
|---------|-------|
| Bank connections | 1 |
| AI queries | 5/month |
| Transaction history | 30 days |
| Savings goals | 1 |
| Sync frequency | Manual only |
| Spending insights | Basic |
| Data export | ❌ |
| Family sharing | ❌ |

### Pro Plan - 2.99 BHD/month (~$7.99 USD)
| Feature | Limit |
|---------|-------|
| Bank connections | 5 |
| AI queries | 100/month |
| Transaction history | Unlimited |
| Savings goals | Unlimited |
| Sync frequency | Auto (daily) |
| Spending insights | Advanced |
| Data export | CSV & PDF |
| Budget alerts | ✅ |
| Priority support | ✅ |
| Family sharing | ❌ |

**Annual: 29.99 BHD/year** (2 months free, ~2.50 BHD/month)

### Family Plan - 5.99 BHD/month (~$15.93 USD)
| Feature | Limit |
|---------|-------|
| Bank connections | 15 (shared) |
| AI queries | 200/month (shared) |
| Transaction history | Unlimited |
| Savings goals | Unlimited |
| Sync frequency | Auto (daily) |
| Spending insights | Advanced |
| Data export | CSV & PDF |
| Budget alerts | ✅ |
| Priority support | ✅ |
| Family members | Up to 7 |
| Family dashboard | ✅ |

**Annual: 59.99 BHD/year** (2 months free, ~5.00 BHD/month)

---

## Cost Breakdown

> Note: Costs calculated in USD for API services, converted to BHD for final analysis

### Per-Bank Costs (Tarabut Gateway - ESTIMATED)
| Sync Type | Cost per Bank/Month |
|-----------|---------------------|
| Manual sync | ~0.19 BHD |
| Daily auto sync | ~0.23 BHD |

### AI Costs (Claude API)
- Cost per query: ~0.002 BHD
- 100 queries: ~0.23 BHD
- 200 queries: ~0.46 BHD

### Fixed Costs per User
| Item | Cost (BHD) |
|------|------------|
| Infrastructure (Supabase, Vercel) | ~0.07 |
| Business costs | ~0.31 |
| Stripe fee (on avg transaction) | ~0.20 |
| **Total fixed** | **~0.58** |

---

## Profitability Analysis

### Free Plan (0 BHD/month)
| Item | Cost (BHD) |
|------|------------|
| 1 bank × manual sync | -0.19 |
| 5 AI queries | -0.01 |
| Infrastructure | -0.04 |
| **Net Cost** | **-0.24** |

### Pro Plan (2.99 BHD/month)
| Item | Cost (BHD) |
|------|------------|
| 5 banks × daily sync | -1.13 |
| 100 AI queries | -0.23 |
| Fixed costs | -0.58 |
| Free user subsidy (5:1 ratio, 4 users) | -0.96 |
| **Total Costs** | **-2.90** |
| **Revenue** | **2.99** |
| **Net Profit** | **+0.09** |
| **Margin** | **~3%** |

### Family Plan (5.99 BHD/month)
| Item | Cost (BHD) |
|------|------------|
| 15 banks × daily sync | -3.39 |
| 200 AI queries | -0.46 |
| Fixed costs | -0.58 |
| **Total Costs** | **-4.43** |
| **Revenue** | **5.99** |
| **Net Profit** | **+1.56** |
| **Margin** | **~26%** |

---

## Target Users

| Plan | Best For | Typical Usage |
|------|----------|---------------|
| **Free** | Trying the app | 1 person, 1 bank |
| **Pro** | Bachelors, Couples | 1-2 people, 3-5 banks |
| **Family** | Families with kids/parents | 3-8 people, 10-15 banks |

---

## Feature Limits Rationale

### Bank Connections
- **Free: 1** - Basic trial experience
- **Pro: 5** - Enough for individual (checking, savings, credit cards)
- **Family: 15** - ~2 banks per family member average

### AI Queries
- **Free: 5/month** - Experience the value
- **Pro: 100/month** - ~3/day for active user
- **Family: 200/month** - Shared pool for family

### Family Members
- **Family: 7** - Covers large Bahraini families (parents, kids, grandparents)

---

## Implementation Notes

### Database Schema
- `profiles.subscription_tier`: "free" | "pro" | "family"
- `profiles.family_group_id`: UUID (for family plan)
- `family_groups` table: id, owner_id, created_at
- `family_members` table: group_id, user_id, role, joined_at

### Stripe Products (to create)
- `prod_finauraa_pro_monthly`: 2.99 BHD/month
- `prod_finauraa_pro_annual`: 29.99 BHD/year
- `prod_finauraa_family_monthly`: 5.99 BHD/month
- `prod_finauraa_family_annual`: 59.99 BHD/year

### Usage Tracking
- Track AI queries in `messages` table
- Track bank connections in `bank_connections` table
- For Family plan: aggregate usage across all family members
- Reset counters on billing cycle date

---

## Future Considerations

1. **Volume discounts from Tarabut** - Negotiate as user base grows
2. **Per-member pricing** - Alternative to flat Family rate
3. **Lifetime deal** - One-time payment for early adopters
4. **Business plan** - For small business expense tracking
