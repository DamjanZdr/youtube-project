-- =============================================================================
-- THREAD MULTI-CATEGORY SUPPORT
-- Junction table to allow threads to belong to multiple categories
-- =============================================================================

-- Junction table
CREATE TABLE IF NOT EXISTS help_thread_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id UUID NOT NULL REFERENCES help_threads(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES help_categories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(thread_id, category_id)
);

CREATE INDEX idx_thread_categories_thread ON help_thread_categories(thread_id);
CREATE INDEX idx_thread_categories_category ON help_thread_categories(category_id);

-- Backfill existing threads into junction table
INSERT INTO help_thread_categories (thread_id, category_id)
SELECT id, category_id FROM help_threads
ON CONFLICT (thread_id, category_id) DO NOTHING;

-- RLS policies
ALTER TABLE help_thread_categories ENABLE ROW LEVEL SECURITY;

-- Anyone can read
CREATE POLICY "Anyone can read thread categories"
  ON help_thread_categories FOR SELECT
  USING (true);

-- Authenticated users can insert (for their own threads)
CREATE POLICY "Authenticated users can insert thread categories"
  ON help_thread_categories FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Thread authors and admins can delete
CREATE POLICY "Thread authors and admins can delete thread categories"
  ON help_thread_categories FOR DELETE
  USING (
    auth.uid() IN (
      SELECT author_id FROM help_threads WHERE id = thread_id
    )
    OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
