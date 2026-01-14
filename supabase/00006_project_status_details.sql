-- =============================================================================
-- PROJECT STATUS DETAILS
-- Per-project, per-status assignees and due dates
-- =============================================================================
-- Last updated: 2026-01-06
-- =============================================================================

-- =============================================================================
-- PROJECT STATUS DETAILS (Assignee and due date per project per status)
-- =============================================================================
CREATE TABLE project_status_details (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  status_id UUID NOT NULL REFERENCES board_statuses(id) ON DELETE CASCADE,
  assignee_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  UNIQUE(project_id, status_id)
);

CREATE INDEX idx_project_status_details_project ON project_status_details(project_id);
CREATE INDEX idx_project_status_details_status ON project_status_details(status_id);
CREATE INDEX idx_project_status_details_assignee ON project_status_details(assignee_id);

CREATE TRIGGER update_project_status_details_updated_at 
  BEFORE UPDATE ON project_status_details 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================
ALTER TABLE project_status_details ENABLE ROW LEVEL SECURITY;

-- Project status details policies (same access as projects)
CREATE POLICY "Org members can view project status details" ON project_status_details
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN organization_members om ON om.organization_id = p.organization_id
      WHERE p.id = project_status_details.project_id
      AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Org members can manage project status details" ON project_status_details
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN organization_members om ON om.organization_id = p.organization_id
      WHERE p.id = project_status_details.project_id
      AND om.user_id = auth.uid()
    )
  );
