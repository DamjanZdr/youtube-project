-- =============================================================================
-- SCENES - Row Level Security Policies
-- =============================================================================
-- Last updated: 2026-01-04 (updated for scenes table)
-- =============================================================================

-- Enable RLS
ALTER TABLE scenes ENABLE ROW LEVEL SECURITY;

-- Organization members can view scenes (via script -> project -> organization)
CREATE POLICY "Organization members can view scenes" ON scenes
  FOR SELECT USING (
    script_id IN (
      SELECT id FROM scripts WHERE project_id IN (
        SELECT id FROM projects WHERE organization_id IN (
          SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
        )
      )
    )
  );

-- Members with edit access can manage scenes
-- CREATE POLICY "Editors can manage scenes" ON scenes
--   FOR ALL USING (
--     script_id IN (
--       SELECT id FROM scripts WHERE project_id IN (
--         SELECT id FROM projects WHERE organization_id IN (
--           SELECT organization_id FROM organization_members 
--           WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'editor')
--         )
--       )
--     )
--   );
