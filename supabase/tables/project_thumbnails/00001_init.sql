-- =============================================================================
-- PROJECT_THUMBNAILS TABLE
-- Multiple thumbnail options for A/B testing in the Packaging tab
-- =============================================================================
-- Last updated: 2026-01-04 (initial schema)
-- =============================================================================

CREATE TABLE project_thumbnails (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,  -- Link to uploaded asset
  url TEXT,                           -- Direct URL (alternative to asset_id)
  is_selected BOOLEAN DEFAULT false,  -- Which thumbnail is currently selected for preview
  position INTEGER DEFAULT 0,         -- Order in the list (up to 5 thumbnails)
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for project lookups
CREATE INDEX idx_project_thumbnails_project ON project_thumbnails(project_id);

-- Composite index for ordered thumbnail queries
CREATE INDEX idx_project_thumbnails_project_position ON project_thumbnails(project_id, position);

-- Updated at trigger
CREATE TRIGGER update_project_thumbnails_updated_at 
  BEFORE UPDATE ON project_thumbnails 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
