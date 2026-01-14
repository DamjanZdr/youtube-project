-- =============================================================================
-- PROJECT_ASSIGNEES - Row Level Security Policies
-- =============================================================================
-- Last updated: 2026-01-04 (initial schema)
-- =============================================================================

-- Enable RLS
ALTER TABLE project_assignees ENABLE ROW LEVEL SECURITY;

-- Organization members can view project assignees
CREATE POLICY "Organization members can view project assignees" ON project_assignees
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
      )
    )
  );

-- Admins and owners can manage project assignees
-- CREATE POLICY "Admins can manage project assignees" ON project_assignees
--   FOR ALL USING (
--     project_id IN (
--       SELECT id FROM projects WHERE organization_id IN (
--         SELECT organization_id FROM organization_members 
--         WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
--       )
--     )
--   );
