-- =============================================================================
-- ORGANIZATIONS TABLE
-- Studios/workspaces that contain channels and projects
-- =============================================================================
-- Last updated: 2026-01-04 (initial schema)
-- =============================================================================

CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for slug lookups (used in URLs)
CREATE INDEX idx_organizations_slug ON organizations(slug);

-- Index for owner lookups
CREATE INDEX idx_organizations_owner ON organizations(owner_id);

-- Updated at trigger
CREATE TRIGGER update_organizations_updated_at 
  BEFORE UPDATE ON organizations 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
