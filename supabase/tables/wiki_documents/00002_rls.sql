-- =============================================================================
-- WIKI_DOCUMENTS - Row Level Security Policies
-- =============================================================================
-- Last updated: 2026-01-04 (initial schema)
-- =============================================================================

-- Enable RLS
ALTER TABLE wiki_documents ENABLE ROW LEVEL SECURITY;

-- Organization members can view wiki documents
CREATE POLICY "Organization members can view wiki documents" ON wiki_documents
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- Editors can manage wiki documents
-- CREATE POLICY "Editors can manage wiki documents" ON wiki_documents
--   FOR ALL USING (
--     organization_id IN (
--       SELECT organization_id FROM organization_members 
--       WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'editor')
--     )
--   );
