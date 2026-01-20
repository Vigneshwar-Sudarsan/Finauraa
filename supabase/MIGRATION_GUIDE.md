# Database Migration Guide

## Overview
This guide helps you apply all pending database migrations to your Supabase project.

## ⚠️ CRITICAL: RLS Policies
**Your database currently has NO Row Level Security (RLS) policies enabled.**

This means ANY authenticated user can read/modify ANY user's data. This is a **critical security vulnerability** that must be fixed immediately.

## Migrations to Apply

### 1. AI Privacy Settings (20250120_add_ai_privacy_settings.sql)
Adds AI privacy mode tracking to `profiles` table:
- `ai_data_mode` column (privacy-first or enhanced)
- `enhanced_ai_consent_given_at` timestamp
- `enhanced_ai_consent_ip` for audit trail

### 2. Row Level Security Policies (20250120_enable_rls_policies.sql)
**CRITICAL SECURITY FIX** - Enables RLS on all tables:
- `profiles`
- `bank_connections`
- `bank_accounts`
- `transactions`
- `budgets`
- `savings_goals`
- `chat_messages` (if exists)

### 3. Transaction Fields (20250120_add_transaction_fields.sql)
Adds Tarabut-specific fields to `transactions` table:
- `provider_id`
- `merchant_logo`
- `category_group`

## How to Apply Migrations

### Option A: Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Create a new query
4. Copy the contents of each migration file in this order:

   **Step 1:** Apply transaction fields
   ```sql
   -- Copy contents from: 20250120_add_transaction_fields.sql
   ```

   **Step 2:** Apply AI privacy settings
   ```sql
   -- Copy contents from: 20250120_add_ai_privacy_settings.sql
   ```

   **Step 3:** Apply RLS policies (CRITICAL)
   ```sql
   -- Copy contents from: 20250120_enable_rls_policies.sql
   ```

5. Run each query
6. Verify no errors in the output

### Option B: Supabase CLI

If you have Supabase CLI installed:

```bash
# Link to your project (if not already linked)
npx supabase link --project-ref YOUR_PROJECT_REF

# Apply all migrations
npx supabase db push

# Or apply specific migration
npx supabase migration up
```

## Verification

### 1. Verify AI Privacy Columns
```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
AND column_name IN ('ai_data_mode', 'enhanced_ai_consent_given_at', 'enhanced_ai_consent_ip');
```

Expected output: 3 rows showing the new columns

### 2. Verify RLS is Enabled
```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'bank_connections', 'bank_accounts', 'transactions', 'budgets', 'savings_goals');
```

Expected output: All tables should have `rowsecurity = true`

### 3. Verify RLS Policies
```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

Expected output: Multiple policies for each table (SELECT, INSERT, UPDATE, DELETE)

### 4. Test RLS is Working
Try querying data from another user - should return empty:
```sql
-- This should return 0 rows if RLS is working
-- (unless you actually have data for the logged-in user)
SELECT COUNT(*) FROM bank_accounts;
```

## Rollback (If Needed)

### Rollback RLS Policies
```sql
-- ONLY use this if you need to rollback RLS (NOT RECOMMENDED)
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE bank_connections DISABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE budgets DISABLE ROW LEVEL SECURITY;
ALTER TABLE savings_goals DISABLE ROW LEVEL SECURITY;

-- Drop all policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
-- ... (repeat for all policies)
```

### Rollback AI Privacy Settings
```sql
ALTER TABLE profiles
DROP COLUMN IF EXISTS ai_data_mode,
DROP COLUMN IF EXISTS enhanced_ai_consent_given_at,
DROP COLUMN IF EXISTS enhanced_ai_consent_ip;
```

## Post-Migration Testing

### 1. Test User Isolation
1. Create two test accounts
2. Log in as User A
3. Create some bank connections/transactions
4. Log out and log in as User B
5. Verify User B cannot see User A's data

### 2. Test AI Mode API
```bash
# Get current AI mode
curl -X GET http://localhost:3000/api/user/ai-mode \
  -H "Cookie: YOUR_SESSION_COOKIE"

# Update AI mode
curl -X POST http://localhost:3000/api/user/ai-mode \
  -H "Content-Type: application/json" \
  -H "Cookie: YOUR_SESSION_COOKIE" \
  -d '{"mode": "enhanced", "consentGiven": true}'
```

### 3. Test Chat in Both Modes
1. Go to chat interface
2. Test with privacy-first mode (should get general responses)
3. Enable Enhanced AI mode (if Pro)
4. Test again (should get specific amounts)

## Troubleshooting

### "permission denied for table X"
- RLS is enabled but user doesn't own the data
- Check if `auth.uid()` matches `user_id` in the table

### "column ai_data_mode does not exist"
- AI privacy migration not applied yet
- Apply `20250120_add_ai_privacy_settings.sql`

### "policy already exists"
- Migration was partially applied
- Drop existing policies first, then reapply

### App showing "unauthorized" errors
- RLS policies might be too restrictive
- Check if `user_id` column exists in all tables
- Verify `auth.uid()` is correctly set

## Security Best Practices

### After Enabling RLS:
1. ✅ Test with multiple user accounts
2. ✅ Verify data isolation
3. ✅ Check all app features still work
4. ✅ Monitor for "permission denied" errors
5. ✅ Set up error logging (Sentry)

### Regular Audits:
```sql
-- Check for tables without RLS
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
AND rowsecurity = false;

-- Should return 0 rows after migration
```

## Support

If you encounter issues:
1. Check Supabase logs (Dashboard → Logs)
2. Verify your Supabase project tier (some features require paid plans)
3. Check if you're using the correct project credentials
4. Review error messages in browser console

## Next Steps After Migration

1. ✅ Test AI mode switching in UI
2. ✅ Test chat with both modes
3. ✅ Verify consent dialog flow
4. ✅ Check comparison examples display
5. ✅ Test on mobile devices
6. ✅ Set up monitoring/analytics
