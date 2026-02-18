-- Add structured idea sections to projects table
-- Sections: brainstorm, hook, value, flow, cta

ALTER TABLE projects 
  ADD COLUMN IF NOT EXISTS idea_brainstorm TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS idea_hook TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS idea_value TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS idea_flow TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS idea_cta TEXT DEFAULT '';

-- Migrate existing idea_content to brainstorm section (if any content exists)
UPDATE projects 
SET idea_brainstorm = idea_content 
WHERE idea_content IS NOT NULL AND idea_content != '';

-- Keep idea_content for backwards compatibility but it will no longer be used
COMMENT ON COLUMN projects.idea_brainstorm IS 'Free-form brainstorming notes for the video idea';
COMMENT ON COLUMN projects.idea_hook IS 'The attention-grabbing hook for the first 5-30 seconds';
COMMENT ON COLUMN projects.idea_value IS 'The core value/benefit viewers will get from the video';
COMMENT ON COLUMN projects.idea_flow IS 'The logical flow and structure of the video content';
COMMENT ON COLUMN projects.idea_cta IS 'The call to action - what you want viewers to do';
