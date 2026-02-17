-- =============================================================================
-- WAITLIST
-- Pre-launch email collection for beta access
-- =============================================================================

-- Create waitlist table
CREATE TABLE IF NOT EXISTS waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  discord_invite_sent BOOLEAN DEFAULT false,
  notes TEXT
);

-- Index for querying
CREATE INDEX IF NOT EXISTS idx_waitlist_email ON waitlist(email);
CREATE INDEX IF NOT EXISTS idx_waitlist_created_at ON waitlist(created_at DESC);

-- RLS policies
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- Only admins can read waitlist
CREATE POLICY "Admins can read waitlist"
  ON waitlist FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Anyone can insert (public signup)
CREATE POLICY "Anyone can join waitlist"
  ON waitlist FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Admins can update waitlist entries
CREATE POLICY "Admins can update waitlist"
  ON waitlist FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Admins can delete waitlist entries
CREATE POLICY "Admins can delete waitlist"
  ON waitlist FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

COMMENT ON TABLE waitlist IS 'Pre-launch waitlist for beta access keys';
