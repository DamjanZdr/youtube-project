-- Add sent_to_email and sent_at columns to plan_keys table
-- Run this if your table already exists without these columns

ALTER TABLE plan_keys 
ADD COLUMN IF NOT EXISTS sent_to_email TEXT,
ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_plan_keys_sent_to_email ON plan_keys(sent_to_email);
CREATE INDEX IF NOT EXISTS idx_plan_keys_assigned_org ON plan_keys(assigned_org_id) WHERE assigned_org_id IS NOT NULL;
