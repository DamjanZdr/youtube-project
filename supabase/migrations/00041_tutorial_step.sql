-- Add tutorial_step column to organization_members to track onboarding progress
-- NULL means tutorial not started, 0+ means steps completed

ALTER TABLE organization_members
ADD COLUMN IF NOT EXISTS tutorial_step INTEGER DEFAULT NULL;

-- Add tutorial_completed timestamp for analytics
ALTER TABLE organization_members
ADD COLUMN IF NOT EXISTS tutorial_completed_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN organization_members.tutorial_step IS 'Current tutorial step (NULL = not started, 0 = just started, 10+ = completed)';
COMMENT ON COLUMN organization_members.tutorial_completed_at IS 'When the user completed or skipped the tutorial';
