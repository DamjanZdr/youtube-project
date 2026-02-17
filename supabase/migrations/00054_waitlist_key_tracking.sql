-- =============================================================================
-- WAITLIST KEY TRACKING
-- Track when beta keys are sent to waitlist members
-- =============================================================================

-- Add key_sent_at column to track when keys were sent
ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS key_sent_at TIMESTAMPTZ;

-- Add index for filtering by key sent status
CREATE INDEX IF NOT EXISTS idx_waitlist_key_sent ON waitlist(key_sent_at);

COMMENT ON COLUMN waitlist.key_sent_at IS 'Timestamp when a plan key was sent to this waitlist member';
