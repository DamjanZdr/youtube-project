-- =============================================================================
-- PLAYLISTS - Row Level Security Policies
-- =============================================================================
-- Last updated: 2026-01-04 (initial schema)
-- =============================================================================

-- Enable RLS
ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;

-- Organization members can view playlists
CREATE POLICY "Organization members can view playlists" ON playlists
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- Members with edit access can create playlists
-- CREATE POLICY "Editors can create playlists" ON playlists
--   FOR INSERT WITH CHECK (
--     organization_id IN (
--       SELECT organization_id FROM organization_members 
--       WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'editor')
--     )
--   );

-- Members with edit access can update playlists
-- CREATE POLICY "Editors can update playlists" ON playlists
--   FOR UPDATE USING (
--     organization_id IN (
--       SELECT organization_id FROM organization_members 
--       WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'editor')
--     )
--   );

-- Admins/owners can delete playlists
-- CREATE POLICY "Admins can delete playlists" ON playlists
--   FOR DELETE USING (
--     organization_id IN (
--       SELECT organization_id FROM organization_members 
--       WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
--     )
--   );
