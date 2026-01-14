-- =============================================================================
-- CHANNEL_BRANDINGS TABLE
-- Branding assets and colors for a channel
-- =============================================================================
-- Last updated: 2026-01-04 (initial schema)
-- =============================================================================

CREATE TABLE channel_brandings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE UNIQUE,
  logo_url TEXT,
  banner_url TEXT,
  watermark_url TEXT,
  primary_color TEXT,      -- Hex color code
  secondary_color TEXT,    -- Hex color code
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Note: channel_id has UNIQUE constraint, so no additional index needed

-- Updated at trigger
CREATE TRIGGER update_channel_brandings_updated_at 
  BEFORE UPDATE ON channel_brandings 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
