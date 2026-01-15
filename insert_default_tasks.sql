-- Direct insert of default tasks for existing statuses
-- This works regardless of when statuses were created

DO $$
DECLARE
  v_idea_id UUID;
  v_package_id UUID;
  v_script_id UUID;
  v_record_id UUID;
  v_edit_id UUID;
  v_review_id UUID;
  v_complete_id UUID;
BEGIN
  -- Get status IDs (assuming single organization for now)
  SELECT id INTO v_idea_id FROM board_statuses WHERE name = 'Idea' LIMIT 1;
  SELECT id INTO v_package_id FROM board_statuses WHERE name = 'Package' LIMIT 1;
  SELECT id INTO v_script_id FROM board_statuses WHERE name = 'Script' LIMIT 1;
  SELECT id INTO v_record_id FROM board_statuses WHERE name = 'Record' LIMIT 1;
  SELECT id INTO v_edit_id FROM board_statuses WHERE name = 'Edit' LIMIT 1;
  SELECT id INTO v_review_id FROM board_statuses WHERE name = 'Review' LIMIT 1;
  SELECT id INTO v_complete_id FROM board_statuses WHERE name = 'Complete' LIMIT 1;

  -- Idea tasks
  IF v_idea_id IS NOT NULL THEN
    INSERT INTO status_default_tasks (status_id, name, position) VALUES
      (v_idea_id, 'One sentence description of the project', 0),
      (v_idea_id, 'Intro hook that will keep the viewer engaged', 1),
      (v_idea_id, 'Loop that will repeat covering majority of the video', 2),
      (v_idea_id, 'Call to action target', 3),
      (v_idea_id, 'Call to action implementation', 4),
      (v_idea_id, 'Video length and reason for it', 5);
  END IF;

  -- Package tasks
  IF v_package_id IS NOT NULL THEN
    INSERT INTO status_default_tasks (status_id, name, position) VALUES
      (v_package_id, 'Make 1-5 thumbnails', 0),
      (v_package_id, 'Compare against your history and choose the best one', 1),
      (v_package_id, 'Write SEO friendly description', 2),
      (v_package_id, 'Add SEO friendly tags', 3),
      (v_package_id, 'Select a playlist this video will be a part of', 4);
  END IF;

  -- Script tasks
  IF v_script_id IS NOT NULL THEN
    INSERT INTO status_default_tasks (status_id, name, position) VALUES
      (v_script_id, 'Write the entire video script scene by scene', 0),
      (v_script_id, 'Write editing visualization for each scene', 1);
  END IF;

  -- Record tasks
  IF v_record_id IS NOT NULL THEN
    INSERT INTO status_default_tasks (status_id, name, position) VALUES
      (v_record_id, 'Record the materials you need for the script (video/voiceovers)', 0),
      (v_record_id, 'Record/Download the needed materials based on the visualization notes', 1);
  END IF;

  -- Edit tasks
  IF v_edit_id IS NOT NULL THEN
    INSERT INTO status_default_tasks (status_id, name, position) VALUES
      (v_edit_id, 'Follow the visualization to match exactly with the script', 0);
  END IF;

  -- Review tasks
  IF v_review_id IS NOT NULL THEN
    INSERT INTO status_default_tasks (status_id, name, position) VALUES
      (v_review_id, 'Watch the video in its entirety', 0),
      (v_review_id, 'Confirm there''s no mistakes and it''s ready for publishing', 1);
  END IF;

  -- Complete tasks
  IF v_complete_id IS NOT NULL THEN
    INSERT INTO status_default_tasks (status_id, name, position) VALUES
      (v_complete_id, 'Make a new upload', 0),
      (v_complete_id, 'Put the correct packaging data', 1),
      (v_complete_id, 'Publish/schedule the video', 2);
  END IF;

END $$;

-- Create trigger if it doesn't exist
CREATE OR REPLACE FUNCTION copy_default_tasks_to_project()
RETURNS TRIGGER AS $$
DECLARE
  task_record RECORD;
  max_position INTEGER;
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.board_status_id IS NOT NULL) OR 
     (TG_OP = 'UPDATE' AND OLD.board_status_id IS DISTINCT FROM NEW.board_status_id AND NEW.board_status_id IS NOT NULL) THEN
    
    SELECT COALESCE(MAX(position), -1) INTO max_position
    FROM project_tasks
    WHERE project_id = NEW.id;
    
    FOR task_record IN 
      SELECT * FROM status_default_tasks 
      WHERE status_id = NEW.board_status_id 
      ORDER BY position
    LOOP
      max_position := max_position + 1;
      INSERT INTO project_tasks (project_id, status_id, name, position)
      VALUES (NEW.id, NEW.board_status_id, task_record.name, max_position);
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_copy_default_tasks ON projects;

CREATE TRIGGER trigger_copy_default_tasks
  AFTER INSERT OR UPDATE OF board_status_id ON projects
  FOR EACH ROW
  EXECUTE FUNCTION copy_default_tasks_to_project();
