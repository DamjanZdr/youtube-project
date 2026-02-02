-- Add processed_at column to plan_keys for edge function idempotency
ALTER TABLE plan_keys
  ADD COLUMN processed_at TIMESTAMPTZ;
