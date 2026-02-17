-- Add key_id to subscriptions to track which key is currently active
-- This allows us to display "Gifted" status and track key expiration

ALTER TABLE subscriptions 
  ADD COLUMN IF NOT EXISTS key_id UUID REFERENCES plan_keys(id) ON DELETE SET NULL;

-- Index for key lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_key_id ON subscriptions(key_id) WHERE key_id IS NOT NULL;

-- Comment
COMMENT ON COLUMN subscriptions.key_id IS 'The plan_key that is currently active for this subscription (if source = key)';
