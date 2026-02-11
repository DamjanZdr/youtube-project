-- =============================================================================
-- FORUM PROFILE VISIBILITY (SECURE)
-- Create a view that only exposes public profile fields (no email)
-- =============================================================================

-- Create a secure view for public profile data
CREATE OR REPLACE VIEW public_profiles AS
SELECT 
  id,
  full_name,
  avatar_url
FROM profiles;

-- Allow all users to query this view
GRANT SELECT ON public_profiles TO authenticated;
GRANT SELECT ON public_profiles TO anon;
