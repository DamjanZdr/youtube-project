-- Add pending subscription change fields
-- This allows us to defer subscription changes (downgrades, yearly->monthly) to the end of the billing period

ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS pending_plan text,
ADD COLUMN IF NOT EXISTS pending_price_id text,
ADD COLUMN IF NOT EXISTS pending_interval text;

COMMENT ON COLUMN subscriptions.pending_plan IS 'The plan that will be activated at the end of the current period (e.g., when downgrading)';
COMMENT ON COLUMN subscriptions.pending_price_id IS 'The Stripe price ID for the pending plan change';
COMMENT ON COLUMN subscriptions.pending_interval IS 'The billing interval for the pending plan change (month/year)';
