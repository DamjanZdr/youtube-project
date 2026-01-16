-- =============================================================================
-- REMOVE 'team' FROM subscription_plan ENUM
-- =============================================================================
-- This migration safely removes the 'team' value and keeps only: 
-- free, creator, studio, enterprise
-- Created: 2026-01-16
-- =============================================================================

-- Step 1: Update pending_plan (it's TEXT type, not enum)
UPDATE subscriptions 
SET pending_plan = 'studio'
WHERE pending_plan = 'team';

-- Step 2: Update plan column (enum type) - cast to text first to avoid enum comparison
UPDATE subscriptions 
SET plan = 'studio'::subscription_plan
WHERE plan::text = 'team';

-- Step 3: Rename the old enum type
ALTER TYPE subscription_plan RENAME TO subscription_plan_old;

-- Step 4: Create new enum without 'team'
CREATE TYPE subscription_plan AS ENUM ('free', 'creator', 'studio', 'enterprise');

-- Step 5: Drop default constraint temporarily
ALTER TABLE subscriptions 
  ALTER COLUMN plan DROP DEFAULT;

-- Step 6: Update column to use new enum
-- (Convert via text to avoid type mismatch)
ALTER TABLE subscriptions 
  ALTER COLUMN plan TYPE subscription_plan USING plan::text::subscription_plan;

-- Step 7: Restore default (set to 'free')
ALTER TABLE subscriptions 
  ALTER COLUMN plan SET DEFAULT 'free';

-- Step 8: Drop the old enum
DROP TYPE subscription_plan_old;

-- Done! The 'team' value is now removed from the enum
