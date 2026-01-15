-- =============================================================================
-- SEED DEFAULT TASKS FOR BOARD STATUSES
-- Populate default tasks for the standard YouTube workflow statuses
-- =============================================================================
-- Last updated: 2026-01-06
-- =============================================================================

-- This migration adds default tasks to existing board statuses based on the
-- standard YouTube content creation workflow. These tasks serve as templates
-- that get copied to new projects when they're created in each status.

-- =============================================================================
-- HELPER FUNCTION: Add default tasks to a status by name
-- =============================================================================
CREATE OR REPLACE FUNCTION add_default_tasks_to_status(
  p_org_id UUID,
  p_status_name TEXT,
  p_tasks TEXT[]
) RETURNS VOID AS $$
DECLARE
  v_status_id UUID;
  v_task TEXT;
  v_position INTEGER := 0;
BEGIN
  -- Find the status ID
  SELECT id INTO v_status_id
  FROM board_statuses
  WHERE organization_id = p_org_id
  AND name = p_status_name;

  -- If status exists, add tasks
  IF v_status_id IS NOT NULL THEN
    FOREACH v_task IN ARRAY p_tasks LOOP
      INSERT INTO status_default_tasks (status_id, name, position)
      VALUES (v_status_id, v_task, v_position)
      ON CONFLICT DO NOTHING;
      v_position := v_position + 1;
    END LOOP;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- SEED DEFAULT TASKS FOR ALL ORGANIZATIONS
-- =============================================================================
DO $$
DECLARE
  org_record RECORD;
BEGIN
  -- Loop through all organizations that have board statuses
  FOR org_record IN (
    SELECT DISTINCT organization_id 
    FROM board_statuses
  ) LOOP
    
    -- Idea Status
    PERFORM add_default_tasks_to_status(
      org_record.organization_id,
      'Idea',
      ARRAY[
        'One sentence description of the project',
        'Intro hook that will keep the viewer engaged',
        'Loop that will repeat covering majority of the video',
        'Call to action target',
        'Call to action implementation',
        'Video length and reason for it'
      ]
    );

    -- Package Status
    PERFORM add_default_tasks_to_status(
      org_record.organization_id,
      'Package',
      ARRAY[
        'Make 1-5 thumbnails',
        'Compare against your history and choose the best one',
        'Write SEO friendly description',
        'Add SEO friendly tags',
        'Select a playlist this video will be a part of'
      ]
    );

    -- Script Status
    PERFORM add_default_tasks_to_status(
      org_record.organization_id,
      'Script',
      ARRAY[
        'Write the entire video script scene by scene',
        'Write editing visualization for each scene'
      ]
    );

    -- Record Status
    PERFORM add_default_tasks_to_status(
      org_record.organization_id,
      'Record',
      ARRAY[
        'Record the materials you need for the script (video/voiceovers)',
        'Record/Download the needed materials based on the visualization notes'
      ]
    );

    -- Edit Status
    PERFORM add_default_tasks_to_status(
      org_record.organization_id,
      'Edit',
      ARRAY[
        'Follow the visualization to match exactly with the script'
      ]
    );

    -- Review Status
    PERFORM add_default_tasks_to_status(
      org_record.organization_id,
      'Review',
      ARRAY[
        'Watch the video in its entirety',
        'Confirm there''s no mistakes and it''s ready for publishing'
      ]
    );

    -- Complete Status
    PERFORM add_default_tasks_to_status(
      org_record.organization_id,
      'Complete',
      ARRAY[
        'Make a new upload',
        'Put the correct packaging data',
        'Publish/schedule the video'
      ]
    );

  END LOOP;
END $$;

-- =============================================================================
-- CLEANUP
-- =============================================================================
DROP FUNCTION IF EXISTS add_default_tasks_to_status(UUID, TEXT, TEXT[]);

-- =============================================================================
-- FUNCTION: Copy default tasks when a project moves to a new status
-- =============================================================================
CREATE OR REPLACE FUNCTION copy_default_tasks_to_project()
RETURNS TRIGGER AS $$
DECLARE
  task_record RECORD;
  max_position INTEGER;
BEGIN
  -- Only proceed if board_status_id changed or is being set for the first time
  IF (TG_OP = 'INSERT' AND NEW.board_status_id IS NOT NULL) OR 
     (TG_OP = 'UPDATE' AND OLD.board_status_id IS DISTINCT FROM NEW.board_status_id AND NEW.board_status_id IS NOT NULL) THEN
    
    -- Get the max position for existing tasks
    SELECT COALESCE(MAX(position), -1) INTO max_position
    FROM project_tasks
    WHERE project_id = NEW.id;
    
    -- Copy default tasks from the status
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

-- =============================================================================
-- TRIGGER: Apply default tasks to new projects
-- =============================================================================
DROP TRIGGER IF EXISTS trigger_copy_default_tasks ON projects;

CREATE TRIGGER trigger_copy_default_tasks
  AFTER INSERT OR UPDATE OF board_status_id ON projects
  FOR EACH ROW
  EXECUTE FUNCTION copy_default_tasks_to_project();

-- =============================================================================
-- NOTES
-- =============================================================================
-- This migration is idempotent and can be run multiple times safely.
-- It only adds default tasks to existing statuses with matching names.
-- Organizations can customize these defaults after the initial seed.
-- 
-- The trigger automatically copies default tasks to projects when:
-- 1. A new project is created with a board_status_id
-- 2. An existing project is moved to a different status
-- 
-- This ensures every project automatically gets the appropriate checklist
-- based on which stage of the workflow it's in.
