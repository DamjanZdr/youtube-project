-- =============================================================================
-- MAKE PLAYLIST CHANNEL_ID NULLABLE
-- =============================================================================
-- Allow playlists to be created without a YouTube channel connection

ALTER TABLE playlists
ALTER COLUMN channel_id DROP NOT NULL;
