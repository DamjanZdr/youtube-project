-- =============================================================================
-- ORGANIZATIONS - Row Level Security Policies
-- =============================================================================
-- Last updated: 2026-01-04 (initial schema)
-- =============================================================================

-- Enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Organization members can view their organizations
CREATE POLICY "Organization members can view" ON organizations
  FOR SELECT USING (
    id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- Only owners can update their organizations
-- CREATE POLICY "Owners can update organization" ON organizations
--   FOR UPDATE USING (owner_id = auth.uid());

-- Only owners can delete their organizations
-- CREATE POLICY "Owners can delete organization" ON organizations
--   FOR DELETE USING (owner_id = auth.uid());

-- Authenticated users can create organizations
-- CREATE POLICY "Authenticated users can create organizations" ON organizations
--   FOR INSERT WITH CHECK (auth.uid() = owner_id);
