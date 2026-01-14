-- =============================================================================
-- SCENES TABLE (formerly script_sections)
-- Storyboard scenes: each row has script text (left) and visual/audio notes (right)
-- =============================================================================
-- Last updated: 2026-01-04 (updated to match storyboard design)
-- =============================================================================

CREATE TABLE scenes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  script_id UUID NOT NULL REFERENCES scripts(id) ON DELETE CASCADE,
  script_text TEXT DEFAULT '',       -- Left column: the actual script/dialogue
  visual_notes TEXT DEFAULT '',      -- Right column: visuals, B-roll, sound effects, etc.
  position INTEGER DEFAULT 0,        -- Order within the storyboard
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for script lookups
CREATE INDEX idx_scenes_script ON scenes(script_id);

-- Composite index for ordered scene queries
CREATE INDEX idx_scenes_script_position ON scenes(script_id, position);

-- Updated at trigger
CREATE TRIGGER update_scenes_updated_at 
  BEFORE UPDATE ON scenes 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
