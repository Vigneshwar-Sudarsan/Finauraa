-- Migration: Enable Row Level Security (RLS) policies for all tables
-- CRITICAL SECURITY: Without RLS, any authenticated user can access ANY user's data
-- Run this in your Supabase SQL Editor

-- ============================================================================
-- 1. PROFILES TABLE
-- ============================================================================

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

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

-- ============================================================================
-- 2. BANK CONNECTIONS TABLE
-- ============================================================================

-- Enable RLS
ALTER TABLE bank_connections ENABLE ROW LEVEL SECURITY;

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

-- ============================================================================
-- 3. BANK ACCOUNTS TABLE
-- ============================================================================

-- Enable RLS
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;

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

-- ============================================================================
-- 4. TRANSACTIONS TABLE
-- ============================================================================

-- Enable RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

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

-- ============================================================================
-- 5. BUDGETS TABLE
-- ============================================================================

-- Enable RLS
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

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

-- ============================================================================
-- 6. SAVINGS GOALS TABLE
-- ============================================================================

-- Enable RLS
ALTER TABLE savings_goals ENABLE ROW LEVEL SECURITY;

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

-- ============================================================================
-- 7. CHAT MESSAGES TABLE (if exists)
-- ============================================================================

-- Check if chat_messages table exists and enable RLS
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'chat_messages') THEN
    ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

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
-- VERIFICATION
-- ============================================================================

-- Run this to verify RLS is enabled on all tables:
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- AND tablename IN ('profiles', 'bank_connections', 'bank_accounts', 'transactions', 'budgets', 'savings_goals');

-- Expected output: All tables should have rowsecurity = true

COMMENT ON TABLE profiles IS 'RLS enabled: Users can only access their own profile';
COMMENT ON TABLE bank_connections IS 'RLS enabled: Users can only access their own bank connections';
COMMENT ON TABLE bank_accounts IS 'RLS enabled: Users can only access their own bank accounts';
COMMENT ON TABLE transactions IS 'RLS enabled: Users can only access their own transactions';
COMMENT ON TABLE budgets IS 'RLS enabled: Users can only access their own budgets';
COMMENT ON TABLE savings_goals IS 'RLS enabled: Users can only access their own savings goals';
