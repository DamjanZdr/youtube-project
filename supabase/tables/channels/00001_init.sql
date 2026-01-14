-- =============================================================================
-- CHANNELS TABLE
-- YouTube channels belonging to an organization
-- =============================================================================
-- Last updated: 2026-01-04 (initial schema)
-- =============================================================================

CREATE TABLE channels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  handle TEXT,               -- YouTube @handle (e.g., @mkbhd)
  youtube_channel_id TEXT,   -- Optional: linked YouTube channel ID
  description TEXT,
  avatar_url TEXT,           -- Channel profile picture
  banner_url TEXT,           -- Channel banner image
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for organization lookups
CREATE INDEX idx_channels_org ON channels(organization_id);

-- Index for YouTube channel ID lookups (when syncing)
CREATE INDEX idx_channels_youtube_id ON channels(youtube_channel_id) WHERE youtube_channel_id IS NOT NULL;

-- Updated at trigger
CREATE TRIGGER update_channels_updated_at 
  BEFORE UPDATE ON channels 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
