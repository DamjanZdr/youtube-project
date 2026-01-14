-- =============================================================================
-- SCRIPTS - Row Level Security Policies
-- =============================================================================
-- Last updated: 2026-01-04 (initial schema)
-- =============================================================================

-- Enable RLS
ALTER TABLE scripts ENABLE ROW LEVEL SECURITY;

-- Organization members can view scripts (via project -> organization)
CREATE POLICY "Organization members can view scripts" ON scripts
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
      )
    )
  );

-- Members with edit access can create scripts
-- CREATE POLICY "Editors can create scripts" ON scripts
--   FOR INSERT WITH CHECK (
--     project_id IN (
--       SELECT id FROM projects WHERE organization_id IN (
--         SELECT organization_id FROM organization_members 
--         WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'editor')
--       )
--     )
--   );

-- Members with edit access can update scripts
-- CREATE POLICY "Editors can update scripts" ON scripts
--   FOR UPDATE USING (
--     project_id IN (
--       SELECT id FROM projects WHERE organization_id IN (
--         SELECT organization_id FROM organization_members 
--         WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'editor')
--       )
--     )
--   );

-- Admins/owners can delete scripts
-- CREATE POLICY "Admins can delete scripts" ON scripts
--   FOR DELETE USING (
--     project_id IN (
--       SELECT id FROM projects WHERE organization_id IN (
--         SELECT organization_id FROM organization_members 
--         WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
--       )
--     )
--   );
