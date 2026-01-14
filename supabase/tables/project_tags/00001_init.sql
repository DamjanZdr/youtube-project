-- =============================================================================
-- PROJECT_TAGS TABLE
-- Tags/keywords for YouTube video SEO (in Packaging tab)
-- =============================================================================
-- Last updated: 2026-01-04 (initial schema)
-- =============================================================================

CREATE TABLE project_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  position INTEGER DEFAULT 0,  -- Order in the list
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for project lookups
CREATE INDEX idx_project_tags_project ON project_tags(project_id);

-- Composite index for ordered tag queries
CREATE INDEX idx_project_tags_project_position ON project_tags(project_id, position);

-- Prevent duplicate tags per project
CREATE UNIQUE INDEX idx_project_tags_unique ON project_tags(project_id, lower(tag));
