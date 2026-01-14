-- =============================================================================
-- ORGANIZATION_MEMBERS - Row Level Security Policies
-- =============================================================================
-- Last updated: 2026-01-04 (initial schema)
-- =============================================================================

-- Enable RLS
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- Members can view other members in their organizations
CREATE POLICY "Members can view organization members" ON organization_members
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- Only admins/owners can add members
-- CREATE POLICY "Admins can add members" ON organization_members
--   FOR INSERT WITH CHECK (
--     organization_id IN (
--       SELECT organization_id FROM organization_members 
--       WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
--     )
--   );

-- Only admins/owners can update member roles
-- CREATE POLICY "Admins can update members" ON organization_members
--   FOR UPDATE USING (
--     organization_id IN (
--       SELECT organization_id FROM organization_members 
--       WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
--     )
--   );

-- Only admins/owners can remove members
-- CREATE POLICY "Admins can remove members" ON organization_members
--   FOR DELETE USING (
--     organization_id IN (
--       SELECT organization_id FROM organization_members 
--       WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
--     )
--   );
