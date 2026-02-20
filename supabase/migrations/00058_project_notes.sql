-- Add internal notes column to projects
ALTER TABLE projects ADD COLUMN IF NOT EXISTS notes text;
