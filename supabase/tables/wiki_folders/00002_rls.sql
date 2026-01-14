-- =============================================================================
-- WIKI_FOLDERS - Row Level Security Policies
-- =============================================================================
-- Last updated: 2026-01-04 (initial schema)
-- =============================================================================

-- Enable RLS
ALTER TABLE wiki_folders ENABLE ROW LEVEL SECURITY;

-- Organization members can view wiki folders
CREATE POLICY "Organization members can view wiki folders" ON wiki_folders
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- Editors can manage wiki folders
-- CREATE POLICY "Editors can manage wiki folders" ON wiki_folders
--   FOR ALL USING (
--     organization_id IN (
--       SELECT organization_id FROM organization_members 
--       WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'editor')
--     )
--   );
