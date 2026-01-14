-- =============================================================================
-- PROJECT_PLAYLISTS - Row Level Security Policies
-- =============================================================================
-- Last updated: 2026-01-04 (initial schema)
-- =============================================================================

-- Enable RLS
ALTER TABLE project_playlists ENABLE ROW LEVEL SECURITY;

-- Organization members can view project-playlist links (via project -> organization)
CREATE POLICY "Organization members can view project playlists" ON project_playlists
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
      )
    )
  );

-- Members with edit access can manage project-playlist links
-- CREATE POLICY "Editors can manage project playlists" ON project_playlists
--   FOR ALL USING (
--     project_id IN (
--       SELECT id FROM projects WHERE organization_id IN (
--         SELECT organization_id FROM organization_members 
--         WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'editor')
--       )
--     )
--   );
