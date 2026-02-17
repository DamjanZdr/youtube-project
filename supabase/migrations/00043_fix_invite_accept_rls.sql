-- =============================================================================
-- FIX INVITE ACCEPT RLS POLICIES
-- Allow users to accept their own pending invites
-- =============================================================================

-- Allow users to update their own pending invites (accept them)
DROP POLICY IF EXISTS "Users can accept their own invites" ON organization_members;
CREATE POLICY "Users can accept their own invites" ON organization_members
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND status = 'pending')
  WITH CHECK (user_id = auth.uid());

-- Also allow org members (not just owners) to view other org members
-- This is needed so the invitee can check the current owner during transfer accept
DROP POLICY IF EXISTS "Org members can view all org members" ON organization_members;
CREATE POLICY "Org members can view all org members" ON organization_members
  FOR SELECT TO authenticated
  USING (
    organization_id IN (SELECT get_user_org_ids())
    OR user_id = auth.uid()  -- Users can always see their own records (including pending)
  );

-- Function to check if a user has membership in an org (for invite checks)
CREATE OR REPLACE FUNCTION check_user_membership(p_org_id UUID, p_user_id UUID)
RETURNS TABLE (
  status TEXT,
  is_transfer BOOLEAN,
  role TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow authenticated users who are org owners
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  -- Check if caller is org owner
  IF NOT EXISTS (
    SELECT 1 FROM organizations WHERE id = p_org_id AND owner_id = auth.uid()
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    om.status::TEXT,
    om.is_transfer,
    om.role::TEXT
  FROM organization_members om
  WHERE om.organization_id = p_org_id
    AND om.user_id = p_user_id
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION check_user_membership(UUID, UUID) TO authenticated;

-- Function to handle ownership transfer acceptance (SECURITY DEFINER)
-- This bypasses RLS to perform the owner swap atomically
CREATE OR REPLACE FUNCTION accept_ownership_transfer(invite_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite RECORD;
  v_current_owner RECORD;
  v_subscription RECORD;
  v_member_limit INT;
BEGIN
  -- Only allow authenticated users
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Get the invite and verify it belongs to the current user
  SELECT * INTO v_invite
  FROM organization_members
  WHERE id = invite_id
    AND user_id = auth.uid()
    AND status = 'pending'
    AND is_transfer = true;

  IF v_invite IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transfer invite not found');
  END IF;

  -- Find the current owner
  SELECT * INTO v_current_owner
  FROM organization_members
  WHERE organization_id = v_invite.organization_id
    AND role = 'owner'
    AND status = 'active';

  IF v_current_owner IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Current owner not found');
  END IF;

  -- Get subscription plan
  SELECT plan INTO v_subscription
  FROM subscriptions
  WHERE organization_id = v_invite.organization_id;

  -- Calculate member limit
  v_member_limit := CASE 
    WHEN v_subscription.plan IN ('free', 'creator') THEN 1
    WHEN v_subscription.plan = 'studio' THEN 4
    ELSE 999
  END;

  -- Handle the transfer
  IF v_member_limit <= 1 THEN
    -- Delete the old owner (kick them out)
    DELETE FROM organization_members WHERE id = v_current_owner.id;
  ELSE
    -- Demote current owner to editor
    UPDATE organization_members 
    SET role = 'editor'
    WHERE id = v_current_owner.id;
  END IF;

  -- Accept the transfer invite (becomes owner)
  UPDATE organization_members
  SET status = 'active', role = 'owner'
  WHERE id = invite_id;

  -- Update organization owner_id
  UPDATE organizations
  SET owner_id = auth.uid()
  WHERE id = v_invite.organization_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION accept_ownership_transfer(UUID) TO authenticated;

COMMENT ON FUNCTION accept_ownership_transfer IS 
'Handles ownership transfer acceptance atomically with proper permissions.
Must be called by the user who has the pending transfer invite.';
