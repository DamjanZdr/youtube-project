-- =============================================================================
-- ASSETS - Row Level Security Policies
-- =============================================================================
-- Last updated: 2026-01-04 (initial schema)
-- =============================================================================

-- Enable RLS
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

-- Organization members can view assets
CREATE POLICY "Organization members can view assets" ON assets
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- Members with edit access can upload assets
-- CREATE POLICY "Editors can create assets" ON assets
--   FOR INSERT WITH CHECK (
--     organization_id IN (
--       SELECT organization_id FROM organization_members 
--       WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'editor')
--     )
--   );

-- Members with edit access can update assets
-- CREATE POLICY "Editors can update assets" ON assets
--   FOR UPDATE USING (
--     organization_id IN (
--       SELECT organization_id FROM organization_members 
--       WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'editor')
--     )
--   );

-- Admins/owners can delete assets
-- CREATE POLICY "Admins can delete assets" ON assets
--   FOR DELETE USING (
--     organization_id IN (
--       SELECT organization_id FROM organization_members 
--       WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
--     )
--   );
