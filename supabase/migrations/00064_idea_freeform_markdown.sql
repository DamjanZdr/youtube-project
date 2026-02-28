-- Migrate from structured idea sections to freeform markdown sections
-- Users can create any sections using # ## ### syntax

-- Add the new freeform markdown column
ALTER TABLE projects 
  ADD COLUMN IF NOT EXISTS idea_markdown TEXT;

-- Migrate existing structured content to markdown format
UPDATE projects 
SET idea_markdown = 
  CASE 
    WHEN COALESCE(idea_brainstorm, '') != '' OR 
         COALESCE(idea_hook, '') != '' OR 
         COALESCE(idea_value, '') != '' OR 
         COALESCE(idea_flow, '') != '' OR 
         COALESCE(idea_cta, '') != '' 
    THEN 
      CONCAT_WS(E'\n\n',
        CASE WHEN COALESCE(idea_brainstorm, '') != '' 
          THEN CONCAT('# Brainstorming', E'\n', idea_brainstorm) 
          ELSE NULL 
        END,
        CASE WHEN COALESCE(idea_hook, '') != '' 
          THEN CONCAT('# 1. Hook', E'\n', idea_hook) 
          ELSE NULL 
        END,
        CASE WHEN COALESCE(idea_value, '') != '' 
          THEN CONCAT('# 2. Value', E'\n', idea_value) 
          ELSE NULL 
        END,
        CASE WHEN COALESCE(idea_flow, '') != '' 
          THEN CONCAT('# 3. Flow', E'\n', idea_flow) 
          ELSE NULL 
        END,
        CASE WHEN COALESCE(idea_cta, '') != '' 
          THEN CONCAT('# 4. CTA', E'\n', idea_cta) 
          ELSE NULL 
        END
      )
    ELSE NULL
  END
WHERE idea_markdown IS NULL;

COMMENT ON COLUMN projects.idea_markdown IS 'Freeform markdown content with sections defined by # headings';

