-- Add feature guide tracking to profiles table
-- This tracks whether users have completed the onboarding feature guide

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS has_seen_feature_guide BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN profiles.has_seen_feature_guide IS
'Whether the user has completed or dismissed the feature guide tutorial';

-- Create index for querying
CREATE INDEX IF NOT EXISTS idx_profiles_feature_guide ON profiles(has_seen_feature_guide);
