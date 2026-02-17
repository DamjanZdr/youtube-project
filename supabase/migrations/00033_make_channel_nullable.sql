-- Make channel_id nullable on projects table
-- Projects belong to studios, channels are just for branding preview

ALTER TABLE projects ALTER COLUMN channel_id DROP NOT NULL;
