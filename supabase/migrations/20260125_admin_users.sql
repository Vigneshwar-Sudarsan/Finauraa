-- Admin Users Table for SEC-04 compliance
-- Replaces ADMIN_EMAILS environment variable with database-controlled access

CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES auth.users(id),
  reason TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Index for fast lookup of active admins
CREATE INDEX idx_admin_users_active ON admin_users(user_id) WHERE is_active = true;

-- Enable RLS
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Self-referential policy: only admins can view admin list
CREATE POLICY "Admins can view admin users"
  ON admin_users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.user_id = auth.uid() AND au.is_active = true
    )
  );

-- Only service role can insert/update/delete (via API)
CREATE POLICY "Service role manages admin users"
  ON admin_users FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

COMMENT ON TABLE admin_users IS 'Stores admin user privileges with audit trail for SEC-04 compliance';
COMMENT ON COLUMN admin_users.granted_by IS 'User who granted admin access (NULL for initial migration)';
COMMENT ON COLUMN admin_users.revoked_at IS 'When admin access was revoked (NULL if active)';
COMMENT ON COLUMN admin_users.reason IS 'Why this user was granted/revoked admin access';
