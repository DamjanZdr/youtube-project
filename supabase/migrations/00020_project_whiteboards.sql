-- =============================================================================
-- PROJECT WHITEBOARDS (Idea Boards)
-- Store whiteboard elements for project brainstorming
-- =============================================================================

-- Whiteboard elements (panels, text boxes, drawings)
CREATE TABLE project_whiteboard_elements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Element type: 'panel', 'text', 'drawing'
  element_type VARCHAR(20) NOT NULL,
  
  -- Position and size
  x DOUBLE PRECISION NOT NULL DEFAULT 0,
  y DOUBLE PRECISION NOT NULL DEFAULT 0,
  width DOUBLE PRECISION,
  height DOUBLE PRECISION,
  
  -- Content
  content TEXT, -- Text content or drawing path data (SVG path for drawings)
  
  -- Styling
  background_color VARCHAR(20) DEFAULT '#1a1a2e',
  border_color VARCHAR(20) DEFAULT '#ffffff20',
  text_color VARCHAR(20) DEFAULT '#ffffff',
  font_size INTEGER DEFAULT 14,
  
  -- For panels with titles
  title VARCHAR(255),
  
  -- Z-index for layering
  z_index INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE INDEX idx_whiteboard_elements_project ON project_whiteboard_elements(project_id);

-- Connections between elements (for mind map lines)
CREATE TABLE project_whiteboard_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Source and target elements
  source_element_id UUID NOT NULL REFERENCES project_whiteboard_elements(id) ON DELETE CASCADE,
  target_element_id UUID NOT NULL REFERENCES project_whiteboard_elements(id) ON DELETE CASCADE,
  
  -- Line styling
  line_color VARCHAR(20) DEFAULT '#ffffff40',
  line_width INTEGER DEFAULT 2,
  line_style VARCHAR(20) DEFAULT 'solid', -- 'solid', 'dashed', 'dotted'
  
  -- Arrow heads
  source_arrow BOOLEAN DEFAULT FALSE,
  target_arrow BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_whiteboard_connections_project ON project_whiteboard_connections(project_id);
CREATE INDEX idx_whiteboard_connections_source ON project_whiteboard_connections(source_element_id);
CREATE INDEX idx_whiteboard_connections_target ON project_whiteboard_connections(target_element_id);

-- RLS Policies
ALTER TABLE project_whiteboard_elements ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_whiteboard_connections ENABLE ROW LEVEL SECURITY;

-- Users can view whiteboard elements if they're members of the org that owns the project
CREATE POLICY "Org members can view whiteboard elements" ON project_whiteboard_elements
  FOR SELECT USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN organization_members om ON om.organization_id = p.organization_id
      WHERE om.user_id = auth.uid() AND om.status = 'active'
    )
  );

-- Users can insert/update/delete if they're members
CREATE POLICY "Org members can manage whiteboard elements" ON project_whiteboard_elements
  FOR ALL USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN organization_members om ON om.organization_id = p.organization_id
      WHERE om.user_id = auth.uid() AND om.status = 'active'
    )
  );

CREATE POLICY "Org members can view whiteboard connections" ON project_whiteboard_connections
  FOR SELECT USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN organization_members om ON om.organization_id = p.organization_id
      WHERE om.user_id = auth.uid() AND om.status = 'active'
    )
  );

CREATE POLICY "Org members can manage whiteboard connections" ON project_whiteboard_connections
  FOR ALL USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN organization_members om ON om.organization_id = p.organization_id
      WHERE om.user_id = auth.uid() AND om.status = 'active'
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_whiteboard_elements_updated_at
  BEFORE UPDATE ON project_whiteboard_elements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
