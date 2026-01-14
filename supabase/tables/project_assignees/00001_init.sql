-- =============================================================================
-- PROJECT_ASSIGNEES TABLE
-- Many-to-many: assigns organization members to projects
-- =============================================================================
-- Last updated: 2026-01-04 (initial schema)
-- =============================================================================

CREATE TABLE project_assignees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  assigned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- Prevent duplicate assignments
  UNIQUE(project_id, user_id)
);

-- Index for project lookups
CREATE INDEX idx_project_assignees_project ON project_assignees(project_id);

-- Index for user lookups (find all projects assigned to a user)
CREATE INDEX idx_project_assignees_user ON project_assignees(user_id);
