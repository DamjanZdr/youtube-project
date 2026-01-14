-- =============================================================================
-- SCRIPTS TABLE
-- Video scripts associated with projects
-- =============================================================================
-- Last updated: 2026-01-04 (initial schema)
-- =============================================================================

CREATE TABLE scripts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content JSONB,              -- Rich text content (e.g., Tiptap/ProseMirror JSON)
  word_count INTEGER DEFAULT 0,
  estimated_duration INTEGER DEFAULT 0,  -- Estimated video duration in seconds
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for project lookups
CREATE INDEX idx_scripts_project ON scripts(project_id);

-- Updated at trigger
CREATE TRIGGER update_scripts_updated_at 
  BEFORE UPDATE ON scripts 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
