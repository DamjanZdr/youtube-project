-- Update the default board statuses function with correct tasks
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
  INSERT INTO board_statuses (organization_id, name, color, position) VALUES
    (org_id, 'Idea', 'bg-purple-500', 0) RETURNING id INTO idea_id;
  INSERT INTO board_statuses (organization_id, name, color, position) VALUES
    (org_id, 'Package', 'bg-orange-500', 1) RETURNING id INTO package_id;
  INSERT INTO board_statuses (organization_id, name, color, position) VALUES
    (org_id, 'Script', 'bg-blue-500', 2) RETURNING id INTO script_id;
  INSERT INTO board_statuses (organization_id, name, color, position) VALUES
    (org_id, 'Record', 'bg-yellow-500', 3) RETURNING id INTO record_id;
  INSERT INTO board_statuses (organization_id, name, color, position) VALUES
    (org_id, 'Edit', 'bg-pink-500', 4) RETURNING id INTO edit_id;
  INSERT INTO board_statuses (organization_id, name, color, position) VALUES
    (org_id, 'Review', 'bg-cyan-500', 5) RETURNING id INTO review_id;
  INSERT INTO board_statuses (organization_id, name, color, position) VALUES
    (org_id, 'Complete', 'bg-green-500', 6) RETURNING id INTO complete_id;
  
  -- Idea tasks
  INSERT INTO status_default_tasks (status_id, name, position) VALUES
    (idea_id, 'One sentence description of the project', 0),
    (idea_id, 'Intro hook that will keep the viewer engaged', 1),
    (idea_id, 'Loop that will repeat covering majority of the video', 2),
    (idea_id, 'Call to action target', 3),
    (idea_id, 'Call to action implementation', 4),
    (idea_id, 'Video length and reason for it', 5);

  -- Package tasks
  INSERT INTO status_default_tasks (status_id, name, position) VALUES
    (package_id, 'Make 1-5 thumbnails', 0),
    (package_id, 'Compare against your history and choose the best one', 1),
    (package_id, 'Write SEO friendly description', 2),
    (package_id, 'Add SEO friendly tags', 3),
    (package_id, 'Select a playlist this video will be a part of', 4);

  -- Script tasks
  INSERT INTO status_default_tasks (status_id, name, position) VALUES
    (script_id, 'Write the entire video script scene by scene', 0),
    (script_id, 'Write editing visualization for each scene', 1);

  -- Record tasks
  INSERT INTO status_default_tasks (status_id, name, position) VALUES
    (record_id, 'Record the materials you need for the script (video/voiceovers)', 0),
    (record_id, 'Record/Download the needed materials based on the visualization notes', 1);

  -- Edit tasks
  INSERT INTO status_default_tasks (status_id, name, position) VALUES
    (edit_id, 'Follow the visualization to match exactly with the script', 0);

  -- Review tasks
  INSERT INTO status_default_tasks (status_id, name, position) VALUES
    (review_id, 'Watch the video in its entirety', 0),
    (review_id, 'Confirm there''s no mistakes and it''s ready for publishing', 1);

  -- Complete tasks
  INSERT INTO status_default_tasks (status_id, name, position) VALUES
    (complete_id, 'Make a new upload', 0),
    (complete_id, 'Put the correct packaging data', 1),
    (complete_id, 'Publish/schedule the video', 2);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-create default statuses for new organizations
CREATE OR REPLACE FUNCTION trigger_create_default_statuses()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM create_default_board_statuses(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop ALL potential duplicate triggers
DROP TRIGGER IF EXISTS auto_create_default_statuses ON organizations;
DROP TRIGGER IF EXISTS create_default_statuses_trigger ON organizations;
DROP TRIGGER IF EXISTS trigger_default_statuses ON organizations;

-- Create the ONE trigger we need
CREATE TRIGGER auto_create_default_statuses
  AFTER INSERT ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION trigger_create_default_statuses();
  
-- Clean up duplicate statuses for existing orgs (optional - run manually if needed)
-- DELETE FROM board_statuses 
-- WHERE id IN (
--   SELECT id FROM (
--     SELECT id, ROW_NUMBER() OVER (PARTITION BY organization_id, name ORDER BY created_at) as rn
--     FROM board_statuses
--   ) t WHERE rn > 1
-- );
