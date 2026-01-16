-- =============================================================================
-- REMOVE 'team' FROM subscription_plan ENUM
-- =============================================================================
-- This migration safely removes the 'team' value and keeps only: 
-- free, creator, studio, enterprise
-- Created: 2026-01-16
-- =============================================================================

-- Step 1: Update any existing 'team' subscriptions to 'studio'
UPDATE subscriptions 
SET plan = 'studio'
WHERE plan = 'team';

-- Step 2: Rename the old enum type
ALTER TYPE subscription_plan RENAME TO subscription_plan_old;

-- Step 3: Create new enum without 'team'
CREATE TYPE subscription_plan AS ENUM ('free', 'creator', 'studio', 'enterprise');

-- Step 4: Update all columns to use new enum
-- (Convert via text to avoid type mismatch)

-- Update subscriptions table
ALTER TABLE subscriptions 
  ALTER COLUMN plan TYPE subscription_plan USING plan::text::subscription_plan;

-- Step 5: Drop the old enum
DROP TYPE subscription_plan_old;

-- Done! The 'team' value is now removed from the enum
