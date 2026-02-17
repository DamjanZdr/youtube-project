-- Update trigger to copy ALL default tasks from ALL statuses
CREATE OR REPLACE FUNCTION copy_default_tasks_to_project()
RETURNS TRIGGER AS $$
DECLARE
  task_record RECORD;
  max_position INTEGER;
BEGIN
  -- Only run on INSERT (new project creation)
  IF TG_OP = 'INSERT' THEN
    
    -- Get the max position for existing tasks
    SELECT COALESCE(MAX(position), -1) INTO max_position
    FROM project_tasks
    WHERE project_id = NEW.id;
    
    -- Copy ALL default tasks from ALL statuses in the organization
    FOR task_record IN 
      SELECT sdt.*, bs.organization_id
      FROM status_default_tasks sdt
      JOIN board_statuses bs ON bs.id = sdt.status_id
      JOIN projects p ON p.organization_id = bs.organization_id
      WHERE p.id = NEW.id
      ORDER BY bs.position, sdt.position
    LOOP
      max_position := max_position + 1;
      INSERT INTO project_tasks (project_id, status_id, name, position)
      VALUES (NEW.id, task_record.status_id, task_record.name, max_position);
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_copy_default_tasks ON projects;

CREATE TRIGGER trigger_copy_default_tasks
  AFTER INSERT ON projects
  FOR EACH ROW
  EXECUTE FUNCTION copy_default_tasks_to_project();
