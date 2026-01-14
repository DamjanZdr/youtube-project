-- =============================================================================
-- PROJECTS TABLE
-- Video projects with Kanban workflow status
-- =============================================================================
-- Last updated: 2026-01-04 (initial schema)
-- =============================================================================

CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  title TEXT NOT NULL,               -- Default/working title (packaging has multiple title options)
  description TEXT,
  status project_status NOT NULL DEFAULT 'idea',
  video_type video_type NOT NULL DEFAULT 'long',  -- Long-form vs YouTube Shorts
  due_date TIMESTAMPTZ,              -- Project deadline
  thumbnail_url TEXT,                -- Default thumbnail (packaging has multiple options)
  youtube_video_id TEXT,             -- Optional: linked YouTube video ID after publish
  scheduled_for TIMESTAMPTZ,         -- When video is scheduled to publish
  published_at TIMESTAMPTZ,          -- When video was actually published
  position INTEGER DEFAULT 0,        -- Order within status column (for Kanban)
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for organization lookups
CREATE INDEX idx_projects_org ON projects(organization_id);

-- Index for channel lookups
CREATE INDEX idx_projects_channel ON projects(channel_id);

-- Index for status filtering (Kanban columns)
CREATE INDEX idx_projects_status ON projects(status);

-- Composite index for Kanban board queries
CREATE INDEX idx_projects_org_status ON projects(organization_id, status, position);

-- Updated at trigger
CREATE TRIGGER update_projects_updated_at 
  BEFORE UPDATE ON projects 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
