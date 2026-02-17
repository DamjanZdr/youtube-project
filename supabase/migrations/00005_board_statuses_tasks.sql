-- =============================================================================
-- BOARD STATUSES & PROJECT TASKS
-- Custom kanban statuses per organization with default tasks
-- =============================================================================
-- Last updated: 2026-01-06
-- =============================================================================

-- =============================================================================
-- BOARD STATUSES (Custom Kanban Columns)
-- =============================================================================
CREATE TABLE board_statuses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'bg-gray-500',
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_board_statuses_org ON board_statuses(organization_id);
CREATE INDEX idx_board_statuses_position ON board_statuses(organization_id, position);

CREATE TRIGGER update_board_statuses_updated_at 
  BEFORE UPDATE ON board_statuses 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- STATUS DEFAULT TASKS (Template tasks for each status)
-- =============================================================================
CREATE TABLE status_default_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  status_id UUID NOT NULL REFERENCES board_statuses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_status_default_tasks_status ON status_default_tasks(status_id);

-- =============================================================================
-- PROJECT TASKS (Actual tasks on projects)
-- =============================================================================
CREATE TABLE project_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  status_id UUID REFERENCES board_statuses(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  position INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_project_tasks_project ON project_tasks(project_id);
CREATE INDEX idx_project_tasks_status ON project_tasks(status_id);

CREATE TRIGGER update_project_tasks_updated_at 
  BEFORE UPDATE ON project_tasks 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================
ALTER TABLE board_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_default_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_tasks ENABLE ROW LEVEL SECURITY;

-- Board Statuses policies
CREATE POLICY "Org members can view board statuses" ON board_statuses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = board_statuses.organization_id
      AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Org owners can manage board statuses" ON board_statuses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM organizations o
      WHERE o.id = board_statuses.organization_id
      AND o.owner_id = auth.uid()
    )
  );

-- Status Default Tasks policies
CREATE POLICY "Org members can view default tasks" ON status_default_tasks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM board_statuses bs
      JOIN organization_members om ON om.organization_id = bs.organization_id
      WHERE bs.id = status_default_tasks.status_id
      AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Org owners can manage default tasks" ON status_default_tasks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM board_statuses bs
      JOIN organizations o ON o.id = bs.organization_id
      WHERE bs.id = status_default_tasks.status_id
      AND o.owner_id = auth.uid()
    )
  );

-- Project Tasks policies
CREATE POLICY "Org members can view project tasks" ON project_tasks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN organization_members om ON om.organization_id = p.organization_id
      WHERE p.id = project_tasks.project_id
      AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Org members can manage project tasks" ON project_tasks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN organization_members om ON om.organization_id = p.organization_id
      WHERE p.id = project_tasks.project_id
      AND om.user_id = auth.uid()
    )
  );

-- =============================================================================
-- UPDATE PROJECTS TABLE
-- Change from enum to UUID reference for custom statuses
-- =============================================================================
ALTER TABLE projects ADD COLUMN board_status_id UUID REFERENCES board_statuses(id) ON DELETE SET NULL;

-- =============================================================================
-- FUNCTION: Initialize default statuses for a new organization
-- =============================================================================
CREATE OR REPLACE FUNCTION create_default_board_statuses(org_id UUID)
RETURNS VOID AS $$
DECLARE
  idea_id UUID;
  package_id UUID;
  script_id UUID;
  record_id UUID;
  edit_id UUID;
  review_id UUID;
  complete_id UUID;
BEGIN
  -- Create default statuses
  INSERT INTO board_statuses (id, organization_id, name, color, position) VALUES
    (uuid_generate_v4(), org_id, 'Idea', 'bg-purple-500', 0) RETURNING id INTO idea_id;
  INSERT INTO board_statuses (id, organization_id, name, color, position) VALUES
    (uuid_generate_v4(), org_id, 'Package', 'bg-orange-500', 1) RETURNING id INTO package_id;
  INSERT INTO board_statuses (id, organization_id, name, color, position) VALUES
    (uuid_generate_v4(), org_id, 'Script', 'bg-blue-500', 2) RETURNING id INTO script_id;
  INSERT INTO board_statuses (id, organization_id, name, color, position) VALUES
    (uuid_generate_v4(), org_id, 'Record', 'bg-yellow-500', 3) RETURNING id INTO record_id;
  INSERT INTO board_statuses (id, organization_id, name, color, position) VALUES
    (uuid_generate_v4(), org_id, 'Edit', 'bg-pink-500', 4) RETURNING id INTO edit_id;
  INSERT INTO board_statuses (id, organization_id, name, color, position) VALUES
    (uuid_generate_v4(), org_id, 'Review', 'bg-cyan-500', 5) RETURNING id INTO review_id;
  INSERT INTO board_statuses (id, organization_id, name, color, position) VALUES
    (uuid_generate_v4(), org_id, 'Complete', 'bg-green-500', 6) RETURNING id INTO complete_id;
  
  -- Create default tasks for each status
  -- Idea
  INSERT INTO status_default_tasks (status_id, name, position) VALUES
    (idea_id, 'Research topic', 0),
    (idea_id, 'Create outline', 1);
  
  -- Package
  INSERT INTO status_default_tasks (status_id, name, position) VALUES
    (package_id, 'Create thumbnail', 0),
    (package_id, 'Write title options', 1),
    (package_id, 'Write description', 2),
    (package_id, 'Add tags', 3);
  
  -- Script
  INSERT INTO status_default_tasks (status_id, name, position) VALUES
    (script_id, 'Write first draft', 0),
    (script_id, 'Review and revise', 1);
  
  -- Record
  INSERT INTO status_default_tasks (status_id, name, position) VALUES
    (record_id, 'Set up equipment', 0),
    (record_id, 'Record footage', 1),
    (record_id, 'Backup files', 2);
  
  -- Edit
  INSERT INTO status_default_tasks (status_id, name, position) VALUES
    (edit_id, 'Rough cut', 0),
    (edit_id, 'Add music/sound', 1),
    (edit_id, 'Color grade', 2),
    (edit_id, 'Final export', 3);
  
  -- Review
  INSERT INTO status_default_tasks (status_id, name, position) VALUES
    (review_id, 'Watch full video', 0),
    (review_id, 'Check audio levels', 1),
    (review_id, 'Approve final', 2);
  
  -- Complete (no default tasks)
END;
$$ LANGUAGE plpgsql;
