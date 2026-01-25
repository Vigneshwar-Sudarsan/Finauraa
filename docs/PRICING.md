# Finauraa Pricing & Feature Limits

> Last updated: January 2026
> Currency: USD (with BHD equivalent for Bahrain market)
> Note: Family tier has been merged into Pro - all family features now included in Pro
> Source of truth: `lib/features.ts` and `feature_flags` database table

## Plan Structure

### Free Plan - $0/month
| Feature | Limit | Feature Key |
|---------|-------|-------------|
| Bank connections | 3 | `bankConnections` |
| AI queries | 5/month | `aiQueriesPerMonth` |
| Transaction history | 30 days | `transactionHistoryDays` |
| Savings goals | 3 | `savingsGoals` |
| Spending limits | 2 | `spendingLimits` |
| Sync frequency | Manual only | `syncFrequency` |
| Spending insights | Basic | `advancedInsights` |
| Data export | ❌ | `exports` |
| Enhanced AI | ❌ | `enhancedAI` |
| Budget alerts | ❌ | `budgetAlerts` |
| Bill reminders | ❌ | `billReminders` |
| Goal progress alerts | ❌ | `goalProgressAlerts` |
| AI insights notifications | ❌ | `aiInsightsNotifications` |
| Family members | 0 | `familyMembers` |
| Family dashboard | ❌ | `familyDashboard` |

### Pro Plan - $7.99/month (~3.00 BHD)
| Feature | Limit | Feature Key |
|---------|-------|-------------|
| Bank connections | Unlimited (-1) | `bankConnections` |
| AI queries | Unlimited (-1) | `aiQueriesPerMonth` |
| Transaction history | Unlimited (null) | `transactionHistoryDays` |
| Savings goals | Unlimited (null) | `savingsGoals` |
| Spending limits | Unlimited (null) | `spendingLimits` |
| Sync frequency | Auto (daily) | `syncFrequency` |
| Spending insights | Advanced | `advancedInsights` |
| Data export | CSV & PDF | `exports`, `exportFormats` |
| Enhanced AI | ✅ (with consent) | `enhancedAI` |
| Budget alerts | ✅ | `budgetAlerts` |
| Bill reminders | ✅ | `billReminders` |
| Goal progress alerts | ✅ | `goalProgressAlerts` |
| AI insights notifications | ✅ | `aiInsightsNotifications` |
| Priority support | ✅ | `prioritySupport` |
| Family members | Up to 5 | `familyMembers` |
| Family dashboard | ✅ | `familyDashboard` |
| Shared goals | ✅ | `sharedGoals` |
| Shared spending limits | ✅ | `sharedSpendingLimits` |

**Annual: $79.99/year** (~$6.67/month, 17% savings)

---

## Feature Details

### Bank Connections
- **Free: 3** - Connect checking, savings, and one credit card
- **Pro: Unlimited** - Connect all your accounts across multiple banks

### AI Queries
- **Free: 5/month** - Basic trial of AI features
- **Pro: Unlimited** - Full AI assistant access

### Transaction History
- **Free: 30 days** - Recent transactions only
- **Pro: Unlimited** - Full historical access

### Savings Goals
- **Free: 3** - Track your main goals
- **Pro: Unlimited** - As many goals as you need

### Spending Limits
- **Free: 2** - Basic category limits
- **Pro: Unlimited** - Full budget control

### Family Features (Pro Only)
- **Up to 5 members** - Including the primary account holder
- **Family dashboard** - View combined spending
- **Shared goals** - Work together on savings
- **Shared spending limits** - Family budgets
- **Data consent** - Each member controls their data sharing

### Enhanced AI (Pro Only)
- Requires explicit user consent
- Sends exact amounts and merchant data to AI
- More specific financial insights
- 7-day data retention by Anthropic
- Revocable anytime

---

## Cost Analysis

### AI Costs (Claude API)
| Tier | Queries | Estimated Cost/User |
|------|---------|-------------------|
| Free | 5/month | ~$0.03 |
| Pro | ~150/month avg | ~$0.75 |

### Infrastructure Costs
| Service | Monthly Cost |
|---------|--------------|
| Supabase (Pro) | $25 |
| Vercel (Pro) | $20 |
| Resend (Email) | $20 |
| Domain | ~$2 |
| **Total** | **~$67/month** |

### Payment Processing
- Stripe fee: 2.9% + $0.30 per transaction
- Average fee on $7.99: ~$0.53

---

## Profitability Analysis

### Free Plan
| Item | Cost |
|------|------|
| 3 banks × manual sync | ~$0.15 |
| 5 AI queries | ~$0.03 |
| Infrastructure share | ~$0.02 |
| **Net Cost/User** | **-$0.20** |

### Pro Plan (Monthly)
| Item | Amount |
|------|--------|
| Revenue | $7.99 |
| AI costs (~150 queries) | -$0.75 |
| Infrastructure share | -$0.10 |
| Stripe fee | -$0.53 |
| Free user subsidy (5:1) | -$1.00 |
| **Net Profit** | **~$5.61** |
| **Margin** | **~70%** |

### Pro Plan (Annual)
| Item | Amount |
|------|--------|
| Revenue | $79.99 |
| AI costs (12 months) | -$9.00 |
| Infrastructure | -$1.20 |
| Stripe fee | -$2.62 |
| **Net Profit** | **~$67.17** |
| **Margin** | **~84%** |

---

## Implementation Details

### Database Schema
```sql
-- profiles table
subscription_tier: "free" | "pro" | "family"  -- family kept for backwards compat
subscription_status: "active" | "trialing" | "past_due" | "canceled"
subscription_started_at: timestamptz
subscription_ends_at: timestamptz
trial_ends_at: timestamptz
stripe_customer_id: text
stripe_subscription_id: text
family_group_id: uuid  -- links to family_groups table
ai_data_mode: "privacy-first" | "enhanced"  -- AI privacy mode
enhanced_ai_consent_given_at: timestamptz
enhanced_ai_consent_ip: text
is_admin: boolean  -- Admin access for feature flags
```

### Stripe Products
- Pro Monthly: `STRIPE_PRO_PRICE_ID_MONTHLY`
- Pro Yearly: `STRIPE_PRO_PRICE_ID_YEARLY`

### Feature Gating (Two Systems)

**1. Static Configuration (`lib/features.ts`):**
- `TIER_LIMITS` - Master configuration object
- `getTierLimits(tier)` - Get limits for a tier
- `checkUsageLimit(tier, feature, usage)` - Validate usage limits
- `isFeatureAvailable(tier, feature)` - Check boolean features
- `hasFamilyFeatures(tier)` - Check if tier has family features

**2. Dynamic Feature Flags (`feature_flags` table):**
- Admin-editable via `/dashboard/settings/admin/feature-flags`
- Categories: `usage_limit`, `boolean_feature`, `notification`, `ai`, `support`
- Supports: boolean, number, string, array value types
- Audit trail in `feature_flag_audit_log` table

### Family Implementation
- `family_groups` table: Group info with owner_id, name
- `family_members` table: Members with roles (owner/admin/member)
- Invitation system with email tokens (7-day expiry)
- Spending consent per member (`spending_consent_given`)
- Family members inherit Pro features from group owner
- Each member maintains individual consent controls
- Transaction scope: personal, family, or auto (smart default)

---

## Upgrade Paths

### Free → Pro
1. User hits a limit (banks, AI queries, goals)
2. Clicks "Upgrade" button
3. Redirected to Stripe checkout
4. After payment, tier updates immediately
5. All Pro features unlocked

### Billing Changes
- Monthly ↔ Annual: Prorate credit applied
- Cancel: Access until period end
- Downgrade: Features restricted at period end

---

## Target Users

| Plan | Best For |
|------|----------|
| **Free** | Trying the app, single bank users |
| **Pro** | Individuals, couples, families up to 5 |

---

## Future Considerations

1. **Volume pricing** - Negotiate lower Tarabut/Claude costs at scale
2. **Business tier** - For freelancers and small businesses
3. **Lifetime deal** - One-time payment for early adopters
4. **Regional pricing** - Adjust for different GCC markets

---

*Last Updated: January 2026*
