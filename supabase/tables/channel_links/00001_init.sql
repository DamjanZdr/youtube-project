-- =============================================================================
-- CHANNEL_LINKS TABLE
-- Social media and external links for channels
-- =============================================================================
-- Last updated: 2026-01-04 (initial schema)
-- =============================================================================

CREATE TABLE channel_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,     -- e.g., 'twitter', 'instagram', 'website', 'discord', etc.
  url TEXT NOT NULL,
  label TEXT,                 -- Optional custom label
  position INTEGER DEFAULT 0, -- Order in the list
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for channel lookups
CREATE INDEX idx_channel_links_channel ON channel_links(channel_id);

-- Updated at trigger
CREATE TRIGGER update_channel_links_updated_at 
  BEFORE UPDATE ON channel_links 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
