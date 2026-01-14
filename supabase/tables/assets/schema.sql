-- =============================================================================
-- ASSETS TABLE
-- Media files (thumbnails, exports, raw footage, etc.)
-- =============================================================================
-- Last updated: 2026-01-04 (initial schema)
-- =============================================================================

CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,  -- Optional: can be org-level asset
  type asset_type NOT NULL,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,     -- Path in Supabase Storage
  file_size BIGINT NOT NULL,   -- Size in bytes
  mime_type TEXT NOT NULL,
  metadata JSONB,              -- Additional metadata (dimensions, duration, etc.)
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for organization lookups
CREATE INDEX idx_assets_org ON assets(organization_id);

-- Index for project lookups
CREATE INDEX idx_assets_project ON assets(project_id);

-- Index for type filtering
CREATE INDEX idx_assets_type ON assets(type);

-- Composite index for common queries
CREATE INDEX idx_assets_org_type ON assets(organization_id, type);

-- Updated at trigger
CREATE TRIGGER update_assets_updated_at 
  BEFORE UPDATE ON assets 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
