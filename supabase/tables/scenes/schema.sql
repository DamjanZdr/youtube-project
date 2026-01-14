-- =============================================================================
-- SCRIPT_SECTIONS TABLE
-- Individual sections within a script (intro, hook, CTA, etc.)
-- =============================================================================
-- Last updated: 2026-01-04 (initial schema)
-- =============================================================================

CREATE TABLE script_sections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  script_id UUID NOT NULL REFERENCES scripts(id) ON DELETE CASCADE,
  type script_section_type NOT NULL DEFAULT 'content',
  title TEXT NOT NULL,
  content TEXT DEFAULT '',
  notes TEXT,          -- Internal notes for the section
  visual_cues TEXT,    -- B-roll, graphics, or visual notes
  position INTEGER DEFAULT 0,  -- Order within the script
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for script lookups
CREATE INDEX idx_script_sections_script ON script_sections(script_id);

-- Composite index for ordered section queries
CREATE INDEX idx_script_sections_script_position ON script_sections(script_id, position);

-- Updated at trigger
CREATE TRIGGER update_script_sections_updated_at 
  BEFORE UPDATE ON script_sections 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
