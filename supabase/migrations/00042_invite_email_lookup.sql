-- =============================================================================
-- INVITE EMAIL LOOKUP FUNCTION
-- Allows authenticated users to look up profiles by email for invites/transfers
-- Uses SECURITY DEFINER to bypass RLS, returning only necessary fields
-- =============================================================================

-- Function to look up a user by email for invite purposes
CREATE OR REPLACE FUNCTION lookup_user_for_invite(lookup_email TEXT)
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  accept_invites BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow authenticated users
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.full_name,
    p.accept_invites
  FROM profiles p
  WHERE p.email = lookup_email
  LIMIT 1;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION lookup_user_for_invite(TEXT) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION lookup_user_for_invite IS 
'Looks up a user profile by email for invite/transfer purposes. 
Returns id, email, full_name, and accept_invites fields.
Uses SECURITY DEFINER to bypass RLS while still requiring authentication.';
