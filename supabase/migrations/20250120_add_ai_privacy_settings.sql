-- Add AI privacy mode settings to profiles table
-- This allows users to choose between privacy-first (anonymized) and enhanced AI (full data)

-- Add new columns to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS ai_data_mode TEXT DEFAULT 'privacy-first' CHECK (ai_data_mode IN ('privacy-first', 'enhanced')),
ADD COLUMN IF NOT EXISTS enhanced_ai_consent_given_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS enhanced_ai_consent_ip TEXT;

-- Add comment explaining the feature
COMMENT ON COLUMN profiles.ai_data_mode IS
'AI data sharing mode: privacy-first (anonymized data) or enhanced (full transaction data).
Enhanced mode requires explicit user consent and Pro tier.';

COMMENT ON COLUMN profiles.enhanced_ai_consent_given_at IS
'Timestamp when user gave explicit consent to share full financial data with AI';

COMMENT ON COLUMN profiles.enhanced_ai_consent_ip IS
'IP address from which consent was given (for audit trail)';

-- Create index for querying by AI mode
CREATE INDEX IF NOT EXISTS idx_profiles_ai_data_mode ON profiles(ai_data_mode);

-- Ensure existing users default to privacy-first mode
UPDATE profiles
SET ai_data_mode = 'privacy-first'
WHERE ai_data_mode IS NULL;
