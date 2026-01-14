-- =============================================================================
-- WIKI_FOLDERS TABLE
-- Folders for organizing wiki documents within a studio (organization)
-- =============================================================================
-- Last updated: 2026-01-04 (initial schema)
-- =============================================================================

CREATE TABLE wiki_folders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  parent_folder_id UUID REFERENCES wiki_folders(id) ON DELETE CASCADE,  -- For nested folders
  position INTEGER DEFAULT 0,  -- Order within parent
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for organization lookups
CREATE INDEX idx_wiki_folders_org ON wiki_folders(organization_id);

-- Index for parent folder lookups (nested folders)
CREATE INDEX idx_wiki_folders_parent ON wiki_folders(parent_folder_id);

-- Composite index for ordered folder queries within org
CREATE INDEX idx_wiki_folders_org_position ON wiki_folders(organization_id, position);

-- Updated at trigger
CREATE TRIGGER update_wiki_folders_updated_at 
  BEFORE UPDATE ON wiki_folders 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
