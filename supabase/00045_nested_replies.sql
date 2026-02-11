-- =============================================================================
-- NESTED REPLIES (1-LEVEL THREADING)
-- Allows replies to have child replies (conversations)
-- =============================================================================

-- Add parent_reply_id to help_thread_replies for 1-level nesting
ALTER TABLE help_thread_replies
ADD COLUMN IF NOT EXISTS parent_reply_id UUID REFERENCES help_thread_replies(id) ON DELETE CASCADE;

-- Index for efficient nested reply lookups
CREATE INDEX IF NOT EXISTS idx_help_thread_replies_parent_reply_id 
ON help_thread_replies(parent_reply_id) 
WHERE parent_reply_id IS NOT NULL;

-- Comment
COMMENT ON COLUMN help_thread_replies.parent_reply_id IS 
'References parent reply for 1-level nested conversations. NULL = top-level reply.';
