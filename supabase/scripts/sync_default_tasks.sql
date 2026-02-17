-- Function to sync a project's tasks with all current default tasks
CREATE OR REPLACE FUNCTION sync_project_default_tasks(p_project_id UUID)
RETURNS void AS $$
DECLARE
  task_record RECORD;
  v_org_id UUID;
  existing_task_id UUID;
BEGIN
  -- Get the project's organization
  SELECT organization_id INTO v_org_id
  FROM projects
  WHERE id = p_project_id;
  
  IF v_org_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Loop through all default tasks for this organization
  FOR task_record IN 
    SELECT sdt.id as default_task_id, sdt.status_id, sdt.name, sdt.position
    FROM status_default_tasks sdt
    JOIN board_statuses bs ON bs.id = sdt.status_id
    WHERE bs.organization_id = v_org_id
    ORDER BY bs.position, sdt.position
  LOOP
    -- Check if this task already exists for this project and status
    SELECT id INTO existing_task_id
    FROM project_tasks
    WHERE project_id = p_project_id
      AND status_id = task_record.status_id
      AND name = task_record.name
    LIMIT 1;
    
    -- If it doesn't exist, add it
    IF existing_task_id IS NULL THEN
      INSERT INTO project_tasks (project_id, status_id, name, position, is_completed)
      VALUES (
        p_project_id,
        task_record.status_id,
        task_record.name,
        task_record.position,
        false
      );
    END IF;
  END LOOP;
  
  -- Remove tasks that are no longer in default tasks
  DELETE FROM project_tasks pt
  WHERE pt.project_id = p_project_id
    AND NOT EXISTS (
      SELECT 1
      FROM status_default_tasks sdt
      JOIN board_statuses bs ON bs.id = sdt.status_id
      WHERE bs.organization_id = v_org_id
        AND sdt.status_id = pt.status_id
        AND sdt.name = pt.name
    );
    
END;
$$ LANGUAGE plpgsql;

-- Function to sync ALL projects in an organization
CREATE OR REPLACE FUNCTION sync_all_projects_default_tasks(p_org_id UUID)
RETURNS void AS $$
DECLARE
  project_record RECORD;
BEGIN
  FOR project_record IN 
    SELECT id FROM projects WHERE organization_id = p_org_id
  LOOP
    PERFORM sync_project_default_tasks(project_record.id);
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Update the insert trigger to use the sync function
CREATE OR REPLACE FUNCTION copy_default_tasks_to_project()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM sync_project_default_tasks(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_copy_default_tasks ON projects;

CREATE TRIGGER trigger_copy_default_tasks
  AFTER INSERT ON projects
  FOR EACH ROW
  EXECUTE FUNCTION copy_default_tasks_to_project();

-- Trigger when default tasks are added/modified/deleted
CREATE OR REPLACE FUNCTION sync_all_on_default_task_change()
RETURNS TRIGGER AS $$
DECLARE
  v_org_id UUID;
BEGIN
  -- Get the organization ID from the status
  SELECT organization_id INTO v_org_id
  FROM board_statuses
  WHERE id = COALESCE(NEW.status_id, OLD.status_id);
  
  IF v_org_id IS NOT NULL THEN
    PERFORM sync_all_projects_default_tasks(v_org_id);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_on_default_task_change ON status_default_tasks;

CREATE TRIGGER trigger_sync_on_default_task_change
  AFTER INSERT OR UPDATE OR DELETE ON status_default_tasks
  FOR EACH ROW
  EXECUTE FUNCTION sync_all_on_default_task_change();
