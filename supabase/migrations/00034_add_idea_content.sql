-- Add idea_content column to projects for the new simple text editor
-- This replaces the complex whiteboard functionality

ALTER TABLE projects ADD COLUMN IF NOT EXISTS idea_content TEXT DEFAULT '';

-- The old whiteboard tables (project_whiteboard_elements, project_whiteboard_connections) 
-- can be kept for now in case you want to reference old data, but won't be used anymore
