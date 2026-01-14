-- =============================================================================
-- SCRIPT_SECTIONS - Row Level Security Policies
-- =============================================================================
-- Last updated: 2026-01-04 (initial schema)
-- =============================================================================

-- Enable RLS
ALTER TABLE script_sections ENABLE ROW LEVEL SECURITY;

-- Organization members can view script sections (via script -> project -> organization)
CREATE POLICY "Organization members can view script sections" ON script_sections
  FOR SELECT USING (
    script_id IN (
      SELECT id FROM scripts WHERE project_id IN (
        SELECT id FROM projects WHERE organization_id IN (
          SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
        )
      )
    )
  );

-- Members with edit access can manage script sections
-- CREATE POLICY "Editors can manage script sections" ON script_sections
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
