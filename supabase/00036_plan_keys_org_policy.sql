-- Allow organization members to see keys assigned to their organization
-- This enables the billing settings page to show pending keys

-- Drop existing policy if it exists (to make this idempotent)
DROP POLICY IF EXISTS "Org members can view assigned keys" ON plan_keys;

-- Allow members of an organization to see keys assigned to that org
CREATE POLICY "Org members can view assigned keys" ON plan_keys
  FOR SELECT
  TO authenticated
  USING (
    assigned_org_id IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM organization_members 
      WHERE organization_members.organization_id = plan_keys.assigned_org_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.status = 'active'
    )
  );
