-- =============================================================================
-- CHANNEL_LINKS - Row Level Security Policies
-- =============================================================================
-- Last updated: 2026-01-04 (initial schema)
-- =============================================================================

-- Enable RLS
ALTER TABLE channel_links ENABLE ROW LEVEL SECURITY;

-- Organization members can view channel links
CREATE POLICY "Organization members can view channel links" ON channel_links
  FOR SELECT USING (
    channel_id IN (
      SELECT id FROM channels WHERE organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
      )
    )
  );

-- Admins can manage channel links
-- CREATE POLICY "Admins can manage channel links" ON channel_links
--   FOR ALL USING (
--     channel_id IN (
--       SELECT id FROM channels WHERE organization_id IN (
--         SELECT organization_id FROM organization_members 
--         WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
--       )
--     )
--   );
