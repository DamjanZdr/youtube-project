-- =============================================================================
-- PROJECTS - Row Level Security Policies
-- =============================================================================
-- Last updated: 2026-01-04 (initial schema)
-- =============================================================================

-- Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Organization members can view projects
CREATE POLICY "Organization members can view projects" ON projects
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- Members with edit access can create projects
-- CREATE POLICY "Editors can create projects" ON projects
--   FOR INSERT WITH CHECK (
--     organization_id IN (
--       SELECT organization_id FROM organization_members 
--       WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'editor')
--     )
--   );

-- Members with edit access can update projects
-- CREATE POLICY "Editors can update projects" ON projects
--   FOR UPDATE USING (
--     organization_id IN (
--       SELECT organization_id FROM organization_members 
--       WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'editor')
--     )
--   );

-- Admins/owners can delete projects
-- CREATE POLICY "Admins can delete projects" ON projects
--   FOR DELETE USING (
--     organization_id IN (
--       SELECT organization_id FROM organization_members 
--       WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
--     )
--   );
