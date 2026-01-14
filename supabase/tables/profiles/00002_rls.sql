-- =============================================================================
-- PROFILES - Row Level Security Policies
-- =============================================================================
-- Last updated: 2026-01-04 (initial schema)
-- =============================================================================

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Note: INSERT is handled by the handle_new_user() trigger function
-- which runs with SECURITY DEFINER privileges
