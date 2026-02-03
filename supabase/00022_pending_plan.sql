-- =============================================================================
-- PENDING PLAN - Schedule a plan to activate after gift expires
-- =============================================================================

-- Add pending_plan columns to subscriptions
ALTER TABLE subscriptions 
  ADD COLUMN IF NOT EXISTS pending_plan TEXT,
  ADD COLUMN IF NOT EXISTS pending_interval TEXT;

-- Comment
COMMENT ON COLUMN subscriptions.pending_plan IS 'Plan to activate when current gift/key expires';
COMMENT ON COLUMN subscriptions.pending_interval IS 'Billing interval for pending plan (month/year)';
