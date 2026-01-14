-- =============================================================================
-- CHANNELS - Row Level Security Policies
-- =============================================================================
-- Last updated: 2026-01-04 (initial schema)
-- =============================================================================

-- Enable RLS
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;

-- Organization members can view channels
CREATE POLICY "Organization members can view channels" ON channels
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- Admins/owners can create channels
-- CREATE POLICY "Admins can create channels" ON channels
--   FOR INSERT WITH CHECK (
--     organization_id IN (
--       SELECT organization_id FROM organization_members 
--       WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
--     )
--   );

-- Admins/owners can update channels
-- CREATE POLICY "Admins can update channels" ON channels
--   FOR UPDATE USING (
--     organization_id IN (
--       SELECT organization_id FROM organization_members 
--       WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
--     )
--   );

-- Admins/owners can delete channels
-- CREATE POLICY "Admins can delete channels" ON channels
--   FOR DELETE USING (
--     organization_id IN (
--       SELECT organization_id FROM organization_members 
--       WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
--     )
--   );
