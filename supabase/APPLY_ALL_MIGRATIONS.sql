-- ============================================================================
-- FINAURAA DATABASE MIGRATIONS - CONSOLIDATED
-- ============================================================================
-- This file contains ALL pending migrations in the correct order
-- Copy and paste this ENTIRE file into your Supabase SQL Editor and run it
-- ============================================================================

-- ============================================================================
-- MIGRATION 1: Add Transaction Fields for Tarabut Integration
-- ============================================================================

-- Add new columns to transactions table
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS provider_id TEXT,
ADD COLUMN IF NOT EXISTS merchant_logo TEXT,
ADD COLUMN IF NOT EXISTS category_group TEXT;

-- Add comments for documentation
COMMENT ON COLUMN transactions.provider_id IS 'Bank provider ID from Tarabut (e.g., SNB, ENBD)';
COMMENT ON COLUMN transactions.merchant_logo IS 'URL to merchant logo from Tarabut';
COMMENT ON COLUMN transactions.category_group IS 'Category group: Expense or Income';

-- Create index for faster filtering by category_group
CREATE INDEX IF NOT EXISTS idx_transactions_category_group ON transactions(category_group);

-- ============================================================================
-- MIGRATION 2: Add AI Privacy Settings to Profiles
-- ============================================================================

-- Add AI privacy mode tracking columns
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS ai_data_mode TEXT DEFAULT 'privacy-first' CHECK (ai_data_mode IN ('privacy-first', 'enhanced')),
ADD COLUMN IF NOT EXISTS enhanced_ai_consent_given_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS enhanced_ai_consent_ip TEXT;

-- Add comments for documentation
COMMENT ON COLUMN profiles.ai_data_mode IS 'AI data sharing mode: privacy-first (anonymized) or enhanced (full data with consent)';
COMMENT ON COLUMN profiles.enhanced_ai_consent_given_at IS 'Timestamp when user gave consent for Enhanced AI mode';
COMMENT ON COLUMN profiles.enhanced_ai_consent_ip IS 'IP address of user when consent was given (for audit trail)';

-- Create index for faster AI mode queries
CREATE INDEX IF NOT EXISTS idx_profiles_ai_data_mode ON profiles(ai_data_mode);

-- ============================================================================
-- MIGRATION 3: Enable Row Level Security (RLS) Policies
-- ============================================================================
-- CRITICAL SECURITY: Without RLS, any authenticated user can access ANY user's data
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. PROFILES TABLE
-- ----------------------------------------------------------------------------

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Policy: Users can only view their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Policy: Users can insert their own profile (for new signups)
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ----------------------------------------------------------------------------
-- 2. BANK CONNECTIONS TABLE
-- ----------------------------------------------------------------------------

-- Enable RLS
ALTER TABLE bank_connections ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own bank connections" ON bank_connections;
DROP POLICY IF EXISTS "Users can insert own bank connections" ON bank_connections;
DROP POLICY IF EXISTS "Users can update own bank connections" ON bank_connections;
DROP POLICY IF EXISTS "Users can delete own bank connections" ON bank_connections;

-- Policy: Users can only view their own bank connections
CREATE POLICY "Users can view own bank connections"
  ON bank_connections FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own bank connections
CREATE POLICY "Users can insert own bank connections"
  ON bank_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own bank connections
CREATE POLICY "Users can update own bank connections"
  ON bank_connections FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own bank connections
CREATE POLICY "Users can delete own bank connections"
  ON bank_connections FOR DELETE
  USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 3. BANK ACCOUNTS TABLE
-- ----------------------------------------------------------------------------

-- Enable RLS
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own bank accounts" ON bank_accounts;
DROP POLICY IF EXISTS "Users can insert own bank accounts" ON bank_accounts;
DROP POLICY IF EXISTS "Users can update own bank accounts" ON bank_accounts;
DROP POLICY IF EXISTS "Users can delete own bank accounts" ON bank_accounts;

-- Policy: Users can only view their own bank accounts
CREATE POLICY "Users can view own bank accounts"
  ON bank_accounts FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own bank accounts
CREATE POLICY "Users can insert own bank accounts"
  ON bank_accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own bank accounts
CREATE POLICY "Users can update own bank accounts"
  ON bank_accounts FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own bank accounts
CREATE POLICY "Users can delete own bank accounts"
  ON bank_accounts FOR DELETE
  USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 4. TRANSACTIONS TABLE
-- ----------------------------------------------------------------------------

-- Enable RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can update own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can delete own transactions" ON transactions;

-- Policy: Users can only view their own transactions
CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own transactions
CREATE POLICY "Users can insert own transactions"
  ON transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own transactions
CREATE POLICY "Users can update own transactions"
  ON transactions FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own transactions
CREATE POLICY "Users can delete own transactions"
  ON transactions FOR DELETE
  USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 5. BUDGETS TABLE
-- ----------------------------------------------------------------------------

-- Enable RLS
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own budgets" ON budgets;
DROP POLICY IF EXISTS "Users can insert own budgets" ON budgets;
DROP POLICY IF EXISTS "Users can update own budgets" ON budgets;
DROP POLICY IF EXISTS "Users can delete own budgets" ON budgets;

-- Policy: Users can only view their own budgets
CREATE POLICY "Users can view own budgets"
  ON budgets FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own budgets
CREATE POLICY "Users can insert own budgets"
  ON budgets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own budgets
CREATE POLICY "Users can update own budgets"
  ON budgets FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own budgets
CREATE POLICY "Users can delete own budgets"
  ON budgets FOR DELETE
  USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 6. SAVINGS GOALS TABLE
-- ----------------------------------------------------------------------------

-- Enable RLS
ALTER TABLE savings_goals ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own savings goals" ON savings_goals;
DROP POLICY IF EXISTS "Users can insert own savings goals" ON savings_goals;
DROP POLICY IF EXISTS "Users can update own savings goals" ON savings_goals;
DROP POLICY IF EXISTS "Users can delete own savings goals" ON savings_goals;

-- Policy: Users can only view their own savings goals
CREATE POLICY "Users can view own savings goals"
  ON savings_goals FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own savings goals
CREATE POLICY "Users can insert own savings goals"
  ON savings_goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own savings goals
CREATE POLICY "Users can update own savings goals"
  ON savings_goals FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own savings goals
CREATE POLICY "Users can delete own savings goals"
  ON savings_goals FOR DELETE
  USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 7. CHAT MESSAGES TABLE (if exists)
-- ----------------------------------------------------------------------------

-- Check if chat_messages table exists and enable RLS
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'chat_messages') THEN
    ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Users can view own chat messages" ON chat_messages;
    DROP POLICY IF EXISTS "Users can insert own chat messages" ON chat_messages;
    DROP POLICY IF EXISTS "Users can delete own chat messages" ON chat_messages;

    -- Policy: Users can only view their own chat messages
    CREATE POLICY "Users can view own chat messages"
      ON chat_messages FOR SELECT
      USING (auth.uid() = user_id);

    -- Policy: Users can insert their own chat messages
    CREATE POLICY "Users can insert own chat messages"
      ON chat_messages FOR INSERT
      WITH CHECK (auth.uid() = user_id);

    -- Policy: Users can delete their own chat messages
    CREATE POLICY "Users can delete own chat messages"
      ON chat_messages FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check AI privacy columns exist
SELECT 'AI Privacy Columns Check:' as verification_step;
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
AND column_name IN ('ai_data_mode', 'enhanced_ai_consent_given_at', 'enhanced_ai_consent_ip');
-- Expected: 3 rows

-- Check RLS is enabled on all tables
SELECT 'RLS Enabled Check:' as verification_step;
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'bank_connections', 'bank_accounts', 'transactions', 'budgets', 'savings_goals')
ORDER BY tablename;
-- Expected: All tables should have rowsecurity = true

-- Check policies are created
SELECT 'RLS Policies Check:' as verification_step;
SELECT tablename, COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;
-- Expected: Each table should have 3-4 policies

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ All migrations applied successfully!';
  RAISE NOTICE '✅ AI privacy settings added to profiles table';
  RAISE NOTICE '✅ Row Level Security enabled on all tables';
  RAISE NOTICE '✅ User data is now isolated and secure';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Check the verification results above';
  RAISE NOTICE '2. Test with your application';
  RAISE NOTICE '3. Create two test users to verify RLS is working';
END $$;
