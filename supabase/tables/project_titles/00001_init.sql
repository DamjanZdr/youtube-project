-- =============================================================================
-- PROJECT_TITLES TABLE
-- Multiple title options for A/B testing in the Packaging tab
-- =============================================================================
-- Last updated: 2026-01-04 (initial schema)
-- =============================================================================

CREATE TABLE project_titles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  is_selected BOOLEAN DEFAULT false,  -- Which title is currently selected for preview
  position INTEGER DEFAULT 0,         -- Order in the list (up to 5 titles)
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for project lookups
CREATE INDEX idx_project_titles_project ON project_titles(project_id);

-- Composite index for ordered title queries
CREATE INDEX idx_project_titles_project_position ON project_titles(project_id, position);

-- Updated at trigger
CREATE TRIGGER update_project_titles_updated_at 
  BEFORE UPDATE ON project_titles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
