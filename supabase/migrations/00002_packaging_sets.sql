-- =============================================================================
-- PACKAGING SETS - Title + Thumbnail pairs for A/B testing
-- =============================================================================

CREATE TABLE packaging_sets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  thumbnail_url TEXT,
  is_selected BOOLEAN DEFAULT false,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_packaging_sets_project ON packaging_sets(project_id);
CREATE INDEX idx_packaging_sets_project_position ON packaging_sets(project_id, position);

CREATE TRIGGER update_packaging_sets_updated_at 
  BEFORE UPDATE ON packaging_sets 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Ensure only one set is selected per project
CREATE UNIQUE INDEX idx_packaging_sets_selected ON packaging_sets(project_id) WHERE is_selected = true;
