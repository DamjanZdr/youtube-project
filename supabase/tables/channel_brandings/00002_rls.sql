-- =============================================================================
-- CHANNEL_BRANDINGS - Row Level Security Policies
-- =============================================================================
-- Last updated: 2026-01-04 (initial schema)
-- =============================================================================

-- Enable RLS
ALTER TABLE channel_brandings ENABLE ROW LEVEL SECURITY;

-- Organization members can view channel branding (via channel -> organization)
CREATE POLICY "Organization members can view channel branding" ON channel_brandings
  FOR SELECT USING (
    channel_id IN (
      SELECT id FROM channels WHERE organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
      )
    )
  );

-- Admins/owners can create/update channel branding
-- CREATE POLICY "Admins can manage channel branding" ON channel_brandings
--   FOR ALL USING (
--     channel_id IN (
--       SELECT id FROM channels WHERE organization_id IN (
--         SELECT organization_id FROM organization_members 
--         WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
--       )
--     )
--   );
