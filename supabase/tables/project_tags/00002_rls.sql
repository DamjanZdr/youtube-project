-- =============================================================================
-- PROJECT_TAGS - Row Level Security Policies
-- =============================================================================
-- Last updated: 2026-01-04 (initial schema)
-- =============================================================================

-- Enable RLS
ALTER TABLE project_tags ENABLE ROW LEVEL SECURITY;

-- Organization members can view project tags
CREATE POLICY "Organization members can view project tags" ON project_tags
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
      )
    )
  );

-- Editors can manage project tags
-- CREATE POLICY "Editors can manage project tags" ON project_tags
--   FOR ALL USING (
--     project_id IN (
--       SELECT id FROM projects WHERE organization_id IN (
--         SELECT organization_id FROM organization_members 
--         WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'editor')
--       )
--     )
--   );
