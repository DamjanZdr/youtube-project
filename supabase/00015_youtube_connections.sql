-- =============================================================================
-- YOUTUBE CONNECTIONS
-- Store OAuth tokens for YouTube channel connections
-- =============================================================================

-- Create table for YouTube OAuth connections (per organization)
CREATE TABLE youtube_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  channel_id VARCHAR(255) NOT NULL, -- YouTube channel ID
  channel_title VARCHAR(255), -- Channel name for display
  channel_thumbnail VARCHAR(500), -- Channel profile picture URL
  access_token TEXT NOT NULL, -- Encrypted OAuth access token
  refresh_token TEXT NOT NULL, -- Encrypted OAuth refresh token
  token_expires_at TIMESTAMPTZ NOT NULL,
  scopes TEXT[], -- Granted OAuth scopes
  connected_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  UNIQUE(organization_id) -- One YouTube connection per organization
);

CREATE INDEX idx_youtube_connections_org ON youtube_connections(organization_id);

-- Add youtube_video_id to projects table for linking
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS youtube_video_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS youtube_video_published_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS youtube_last_synced_at TIMESTAMPTZ;

-- RLS Policies
ALTER TABLE youtube_connections ENABLE ROW LEVEL SECURITY;

-- Org members can view their YouTube connection
CREATE POLICY "Org members can view youtube connections" ON youtube_connections
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
  );

-- Only owners can manage YouTube connections
CREATE POLICY "Org owners can manage youtube connections" ON youtube_connections
  FOR ALL USING (
    EXISTS (SELECT 1 FROM organizations WHERE id = organization_id AND owner_id = auth.uid())
  );

-- Trigger for updated_at
CREATE TRIGGER update_youtube_connections_updated_at
  BEFORE UPDATE ON youtube_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
