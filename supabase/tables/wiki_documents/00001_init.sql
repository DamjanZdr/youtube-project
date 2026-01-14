-- =============================================================================
-- WIKI_DOCUMENTS TABLE
-- Documents within wiki folders
-- =============================================================================
-- Last updated: 2026-01-04 (initial schema)
-- =============================================================================

CREATE TABLE wiki_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  folder_id UUID REFERENCES wiki_folders(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,  -- Direct org link for root-level docs
  title TEXT NOT NULL,
  content TEXT DEFAULT '',     -- Rich text content (could be markdown, JSON, etc.)
  position INTEGER DEFAULT 0,  -- Order within folder
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for folder lookups
CREATE INDEX idx_wiki_documents_folder ON wiki_documents(folder_id);

-- Index for organization lookups (for root-level docs)
CREATE INDEX idx_wiki_documents_org ON wiki_documents(organization_id);

-- Composite index for ordered document queries within folder
CREATE INDEX idx_wiki_documents_folder_position ON wiki_documents(folder_id, position);

-- Updated at trigger
CREATE TRIGGER update_wiki_documents_updated_at 
  BEFORE UPDATE ON wiki_documents 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
