-- Migration: BOBF & PDPL Compliance Tables and Fields
-- Bahrain Open Banking Framework (BOBF) & Personal Data Protection Law (PDPL)
-- Run this in your Supabase SQL Editor

-- ============================================================================
-- 1. USER CONSENTS TABLE - Comprehensive consent tracking
-- Required by: BOBF (consent management), PDPL (explicit consent)
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Consent identification
  consent_type TEXT NOT NULL CHECK (consent_type IN ('bank_access', 'ai_data', 'marketing', 'terms_of_service', 'privacy_policy')),
  provider_id TEXT, -- Bank/ASPSP identifier for bank_access type
  provider_name TEXT, -- Bank name for display

  -- Permissions granted (array of specific permissions)
  permissions_granted TEXT[] NOT NULL DEFAULT '{}',
  -- For bank_access: ReadAccountsBasic, ReadAccountsDetail, ReadBalances, ReadTransactionsBasic, ReadTransactionsDetail
  -- For ai_data: ShareTransactions, ShareBalances, ShareInsights

  -- Purpose and scope
  purpose TEXT NOT NULL, -- Clear description of why data is being accessed
  scope TEXT, -- Additional scope details

  -- Consent lifecycle
  consent_given_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  consent_expires_at TIMESTAMPTZ NOT NULL, -- Must have expiry (BOBF requirement)
  consent_status TEXT NOT NULL DEFAULT 'active' CHECK (consent_status IN ('active', 'revoked', 'expired', 'pending')),

  -- Revocation tracking
  revoked_at TIMESTAMPTZ,
  revocation_reason TEXT,
  revoked_by TEXT CHECK (revoked_by IN ('user', 'system', 'admin', 'provider')),

  -- Audit trail (PDPL requirement)
  ip_address INET,
  user_agent TEXT,
  consent_version TEXT NOT NULL DEFAULT '1.0', -- Track T&C versions

  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_user_consents_user_id ON user_consents(user_id);
CREATE INDEX idx_user_consents_status ON user_consents(consent_status);
CREATE INDEX idx_user_consents_type ON user_consents(consent_type);
CREATE INDEX idx_user_consents_expires_at ON user_consents(consent_expires_at);
CREATE INDEX idx_user_consents_provider ON user_consents(provider_id) WHERE provider_id IS NOT NULL;

-- Enable RLS
ALTER TABLE user_consents ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own consents"
  ON user_consents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own consents"
  ON user_consents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own consents"
  ON user_consents FOR UPDATE
  USING (auth.uid() = user_id);

-- Note: No DELETE policy - consents should be revoked, not deleted (audit requirement)

COMMENT ON TABLE user_consents IS 'BOBF/PDPL compliant consent tracking with full audit trail';

-- ============================================================================
-- 2. AUDIT LOGS TABLE - All data access tracking
-- Required by: PDPL (accountability), CBB Rulebook (audit requirements)
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Actor identification
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL, -- Can be null for system actions
  performed_by TEXT NOT NULL CHECK (performed_by IN ('user', 'system', 'admin', 'webhook', 'cron')),

  -- Action details
  action_type TEXT NOT NULL,
  -- Common action types:
  -- data_access, data_fetch, data_create, data_update, data_delete,
  -- consent_given, consent_revoked, consent_expired,
  -- login, logout, password_change,
  -- export_requested, export_completed,
  -- bank_connected, bank_disconnected, bank_synced

  -- Resource details
  resource_type TEXT NOT NULL,
  -- Resource types: profile, bank_connection, bank_account, transaction, consent, conversation, message
  resource_id TEXT, -- UUID or identifier of the resource

  -- Request context
  ip_address INET,
  user_agent TEXT,
  request_method TEXT, -- GET, POST, PUT, DELETE
  request_path TEXT, -- API endpoint
  request_details JSONB DEFAULT '{}', -- Parameters, filters, etc.

  -- Response details
  response_status INTEGER, -- HTTP status code
  response_details JSONB DEFAULT '{}', -- Error messages, affected count, etc.

  -- Timing
  action_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  duration_ms INTEGER, -- Request duration in milliseconds

  -- Metadata
  session_id TEXT,
  correlation_id TEXT, -- For tracking related actions
  metadata JSONB DEFAULT '{}'
);

-- Indexes for querying audit logs
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action_type ON audit_logs(action_type);
CREATE INDEX idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(action_timestamp DESC);
CREATE INDEX idx_audit_logs_correlation ON audit_logs(correlation_id) WHERE correlation_id IS NOT NULL;

-- Composite index for common queries
CREATE INDEX idx_audit_logs_user_action ON audit_logs(user_id, action_type, action_timestamp DESC);

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Users can only view their own audit logs
CREATE POLICY "Users can view own audit logs"
  ON audit_logs FOR SELECT
  USING (auth.uid() = user_id);

-- System/admin insert policy (service role bypasses RLS)
CREATE POLICY "System can insert audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (true); -- Service role will bypass, but this allows system inserts

COMMENT ON TABLE audit_logs IS 'PDPL/CBB compliant audit trail for all data access and modifications';

-- ============================================================================
-- 3. DATA RETENTION POLICIES TABLE - Configurable retention rules
-- Required by: PDPL (data minimization), BOBF (consent expiry)
-- ============================================================================

CREATE TABLE IF NOT EXISTS data_retention_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Policy identification
  policy_name TEXT NOT NULL UNIQUE,
  data_type TEXT NOT NULL, -- accounts, transactions, consents, audit_logs, messages

  -- Retention periods
  retention_period_days INTEGER NOT NULL, -- How long to keep data after creation
  post_revocation_retention_days INTEGER NOT NULL DEFAULT 30, -- How long to keep after consent revoked

  -- Actions
  action_on_expiry TEXT NOT NULL DEFAULT 'anonymize' CHECK (action_on_expiry IN ('delete', 'anonymize', 'archive')),
  anonymization_fields TEXT[], -- Which fields to anonymize if action is 'anonymize'

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Metadata
  description TEXT,
  legal_basis TEXT, -- Reference to regulation requiring this policy
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

-- Insert default retention policies
INSERT INTO data_retention_policies (policy_name, data_type, retention_period_days, post_revocation_retention_days, action_on_expiry, description, legal_basis) VALUES
  ('transactions_retention', 'transactions', 365, 30, 'anonymize', 'Transaction data retained for 1 year, anonymized 30 days after consent revocation', 'PDPL Art. 5 - Data Minimization'),
  ('bank_accounts_retention', 'bank_accounts', 365, 30, 'delete', 'Bank account data deleted after consent revocation + 30 days', 'BOBF Consent Requirements'),
  ('audit_logs_retention', 'audit_logs', 2555, 2555, 'archive', 'Audit logs retained for 7 years as required by CBB', 'CBB Rulebook - Record Keeping'),
  ('consents_retention', 'consents', 2555, 2555, 'archive', 'Consent records retained for 7 years for compliance proof', 'PDPL Art. 7 - Consent Records'),
  ('messages_retention', 'messages', 365, 7, 'delete', 'Chat messages deleted 7 days after consent revocation', 'PDPL Art. 5 - Data Minimization')
ON CONFLICT (policy_name) DO NOTHING;

COMMENT ON TABLE data_retention_policies IS 'Configurable data retention rules for PDPL compliance';

-- ============================================================================
-- 4. BILLING HISTORY TABLE - Payment records
-- Already referenced in webhook code, creating proper table
-- ============================================================================

CREATE TABLE IF NOT EXISTS billing_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Stripe references
  stripe_invoice_id TEXT UNIQUE,
  stripe_payment_intent_id TEXT,
  stripe_subscription_id TEXT,

  -- Amount details
  amount INTEGER NOT NULL, -- Amount in smallest currency unit (fils for BHD)
  currency TEXT NOT NULL DEFAULT 'bhd',

  -- Status
  status TEXT NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded', 'canceled')),

  -- Invoice details
  invoice_url TEXT,
  invoice_pdf_url TEXT,
  description TEXT,

  -- Period
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,

  -- Failure details
  failure_reason TEXT,
  failure_code TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_billing_history_user_id ON billing_history(user_id);
CREATE INDEX idx_billing_history_status ON billing_history(status);
CREATE INDEX idx_billing_history_created ON billing_history(created_at DESC);
CREATE INDEX idx_billing_history_stripe_invoice ON billing_history(stripe_invoice_id) WHERE stripe_invoice_id IS NOT NULL;

-- Enable RLS
ALTER TABLE billing_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own billing history"
  ON billing_history FOR SELECT
  USING (auth.uid() = user_id);

-- Insert is done by webhook with service role
CREATE POLICY "System can insert billing history"
  ON billing_history FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update billing history"
  ON billing_history FOR UPDATE
  USING (true);

COMMENT ON TABLE billing_history IS 'User payment and invoice history from Stripe';

-- ============================================================================
-- 5. ADD SOFT DELETE COLUMNS TO EXISTING TABLES
-- Required by: PDPL (right to deletion with audit trail)
-- ============================================================================

-- Add soft delete to bank_connections
ALTER TABLE bank_connections
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by TEXT CHECK (deleted_by IN ('user', 'system', 'admin', 'consent_revoked'));

-- Add soft delete to bank_accounts
ALTER TABLE bank_accounts
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by TEXT CHECK (deleted_by IN ('user', 'system', 'admin', 'consent_revoked'));

-- Add soft delete and retention to transactions
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by TEXT CHECK (deleted_by IN ('user', 'system', 'admin', 'consent_revoked')),
  ADD COLUMN IF NOT EXISTS retention_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_anonymized BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS consent_id UUID REFERENCES user_consents(id);

-- Add indexes for soft delete queries
CREATE INDEX IF NOT EXISTS idx_bank_connections_deleted ON bank_connections(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_bank_accounts_deleted ON bank_accounts(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_deleted ON transactions(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_retention ON transactions(retention_expires_at) WHERE retention_expires_at IS NOT NULL;

-- ============================================================================
-- 6. ADD SUBSCRIPTION FIELDS TO PROFILES (if not exists)
-- ============================================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'family')),
  ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'trialing', 'past_due', 'canceled', 'canceling', 'paused', 'incomplete', 'incomplete_expired', 'unpaid')),
  ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

-- Index for Stripe lookups
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer ON profiles(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

-- ============================================================================
-- 7. DATA EXPORT REQUESTS TABLE - Track PDPL data portability requests
-- Required by: PDPL (right to data portability)
-- ============================================================================

CREATE TABLE IF NOT EXISTS data_export_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Request details
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'expired')),
  format TEXT NOT NULL DEFAULT 'json' CHECK (format IN ('json', 'csv', 'pdf')),

  -- What to include
  include_profile BOOLEAN DEFAULT true,
  include_transactions BOOLEAN DEFAULT true,
  include_accounts BOOLEAN DEFAULT true,
  include_consents BOOLEAN DEFAULT true,
  include_messages BOOLEAN DEFAULT false,

  -- File details
  file_url TEXT, -- Signed URL for download
  file_expires_at TIMESTAMPTZ,
  file_size_bytes INTEGER,

  -- Processing
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,

  -- Audit
  ip_address INET,
  user_agent TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE data_export_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own export requests"
  ON data_export_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create export requests"
  ON data_export_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE data_export_requests IS 'PDPL data portability - user data export requests';

-- ============================================================================
-- 8. DATA DELETION REQUESTS TABLE - Track PDPL right to erasure
-- Required by: PDPL (right to erasure)
-- ============================================================================

CREATE TABLE IF NOT EXISTS data_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Request details
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'rejected')),
  deletion_type TEXT NOT NULL CHECK (deletion_type IN ('full_account', 'bank_data', 'transaction_history', 'chat_history', 'specific_consent')),

  -- Scope
  consent_id UUID REFERENCES user_consents(id), -- For specific consent deletion
  reason TEXT,

  -- Processing
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  scheduled_for TIMESTAMPTZ, -- When deletion will occur (for retention period)
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Results
  items_deleted INTEGER DEFAULT 0,
  items_anonymized INTEGER DEFAULT 0,
  error_message TEXT,

  -- Audit
  ip_address INET,
  user_agent TEXT,
  processed_by TEXT CHECK (processed_by IN ('system', 'admin')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE data_deletion_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own deletion requests"
  ON data_deletion_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create deletion requests"
  ON data_deletion_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE data_deletion_requests IS 'PDPL right to erasure - user data deletion requests';

-- ============================================================================
-- 9. HELPER FUNCTIONS
-- ============================================================================

-- Function to check if user has active consent for a resource
CREATE OR REPLACE FUNCTION has_active_consent(
  p_user_id UUID,
  p_consent_type TEXT,
  p_provider_id TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_consents
    WHERE user_id = p_user_id
      AND consent_type = p_consent_type
      AND consent_status = 'active'
      AND consent_expires_at > NOW()
      AND (p_provider_id IS NULL OR provider_id = p_provider_id)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log audit event
CREATE OR REPLACE FUNCTION log_audit_event(
  p_user_id UUID,
  p_action_type TEXT,
  p_resource_type TEXT,
  p_resource_id TEXT DEFAULT NULL,
  p_performed_by TEXT DEFAULT 'user',
  p_details JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO audit_logs (
    user_id, action_type, resource_type, resource_id,
    performed_by, request_details, action_timestamp
  ) VALUES (
    p_user_id, p_action_type, p_resource_type, p_resource_id,
    p_performed_by, p_details, NOW()
  ) RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to expire consents
CREATE OR REPLACE FUNCTION expire_consents() RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE user_consents
  SET consent_status = 'expired',
      updated_at = NOW()
  WHERE consent_status = 'active'
    AND consent_expires_at <= NOW();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 10. UPDATE TRIGGERS
-- ============================================================================

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to new tables
CREATE TRIGGER update_user_consents_updated_at
  BEFORE UPDATE ON user_consents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_billing_history_updated_at
  BEFORE UPDATE ON billing_history
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_data_retention_policies_updated_at
  BEFORE UPDATE ON data_retention_policies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Run these to verify migration:

-- Check new tables exist:
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public'
-- AND table_name IN ('user_consents', 'audit_logs', 'data_retention_policies', 'billing_history', 'data_export_requests', 'data_deletion_requests');

-- Check RLS is enabled:
-- SELECT tablename, rowsecurity FROM pg_tables
-- WHERE schemaname = 'public'
-- AND tablename IN ('user_consents', 'audit_logs', 'billing_history', 'data_export_requests', 'data_deletion_requests');

-- Check soft delete columns:
-- SELECT column_name, table_name FROM information_schema.columns
-- WHERE table_schema = 'public' AND column_name = 'deleted_at';

COMMENT ON FUNCTION has_active_consent IS 'Check if user has active consent for a specific type/provider';
COMMENT ON FUNCTION log_audit_event IS 'Helper to log audit events from application code';
COMMENT ON FUNCTION expire_consents IS 'Mark expired consents - run via cron job';
