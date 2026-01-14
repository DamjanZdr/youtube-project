-- =============================================================================
-- PLAYLISTS TABLE
-- Video playlists/series for organizing projects
-- =============================================================================
-- Last updated: 2026-01-04 (initial schema)
-- =============================================================================

CREATE TABLE playlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  youtube_playlist_id TEXT,  -- Optional: linked YouTube playlist ID
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for organization lookups
CREATE INDEX idx_playlists_org ON playlists(organization_id);

-- Index for channel lookups
CREATE INDEX idx_playlists_channel ON playlists(channel_id);

-- Updated at trigger
CREATE TRIGGER update_playlists_updated_at 
  BEFORE UPDATE ON playlists 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
