-- Add font preferences to wiki_documents
ALTER TABLE wiki_documents
ADD COLUMN font_family TEXT DEFAULT 'Inter',
ADD COLUMN font_size TEXT DEFAULT '16px';

-- Add index for better query performance (optional but good practice)
COMMENT ON COLUMN wiki_documents.font_family IS 'User-selected font family for document';
COMMENT ON COLUMN wiki_documents.font_size IS 'User-selected font size for document';
