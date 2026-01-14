-- =============================================================================
-- PROFILES TABLE
-- Extends Supabase auth.users with additional profile data
-- =============================================================================
-- Last updated: 2026-01-04 (initial schema)
-- =============================================================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for email lookups
-- CREATE INDEX idx_profiles_email ON profiles(email);

-- Updated at trigger
CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
