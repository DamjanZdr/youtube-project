-- =============================================================================
-- USERNAMES
-- Add unique username field to profiles for @mentions
-- =============================================================================

-- Add username column
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS username TEXT;

-- Add unique constraint
ALTER TABLE profiles
ADD CONSTRAINT profiles_username_unique UNIQUE (username);

-- Add check constraint for valid username format (alphanumeric, underscores, 3-20 chars)
ALTER TABLE profiles
ADD CONSTRAINT profiles_username_format CHECK (
  username IS NULL OR (
    username ~ '^[a-z0-9_]{3,20}$'
  )
);

-- Index for fast username lookups
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username) WHERE username IS NOT NULL;

-- Update public_profiles view to include username
CREATE OR REPLACE VIEW public_profiles AS
SELECT 
  id,
  username,
  full_name,
  avatar_url
FROM profiles;

-- Re-grant access after view recreation
GRANT SELECT ON public_profiles TO authenticated;
GRANT SELECT ON public_profiles TO anon;

-- Comment
COMMENT ON COLUMN profiles.username IS 'Unique username for @mentions. Lowercase alphanumeric and underscores only, 3-20 characters.';
