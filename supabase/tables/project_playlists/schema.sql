-- =============================================================================
-- PROJECT_PLAYLISTS TABLE
-- Junction table linking projects to playlists (many-to-many)
-- =============================================================================
-- Last updated: 2026-01-04 (initial schema)
-- =============================================================================

CREATE TABLE project_playlists (
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  playlist_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  position INTEGER DEFAULT 0,  -- Order within the playlist
  
  PRIMARY KEY (project_id, playlist_id)
);

-- Index for playlist lookups (find all projects in a playlist)
CREATE INDEX idx_project_playlists_playlist ON project_playlists(playlist_id);
