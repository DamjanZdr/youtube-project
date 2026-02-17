-- Add deactivated_at column to plan_keys for soft-delete functionality
ALTER TABLE plan_keys
  ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deactivated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Index for filtering active vs deactivated keys
CREATE INDEX IF NOT EXISTS idx_plan_keys_deactivated ON plan_keys(deactivated_at);
