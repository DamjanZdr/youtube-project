-- Fix orphaned subscriptions (where key was deleted directly without going through deactivation flow)

-- First, let's see what we're dealing with
-- Find subscriptions with source='key' that don't have a valid key_id 
-- OR have key_id pointing to deleted/deactivated keys

-- Preview: Find orphaned subscriptions
SELECT 
  s.id as subscription_id,
  s.organization_id,
  o.name as org_name,
  s.plan,
  s.source,
  s.key_id,
  s.status,
  pk.id as key_exists,
  pk.deactivated_at
FROM subscriptions s
LEFT JOIN organizations o ON o.id = s.organization_id
LEFT JOIN plan_keys pk ON pk.id = s.key_id
WHERE s.source = 'key'
  AND s.plan != 'free'
  AND (
    s.key_id IS NULL  -- Key reference was cleared (ON DELETE SET NULL)
    OR pk.id IS NULL  -- Key doesn't exist
    OR pk.deactivated_at IS NOT NULL  -- Key was deactivated
  );

-- To fix them, run this UPDATE:
-- This will reset orphaned key-based subscriptions to free

/*
UPDATE subscriptions s
SET 
  plan = 'free',
  source = NULL,
  key_id = NULL,
  current_period_end = NULL,
  updated_at = NOW()
FROM organizations o
WHERE s.organization_id = o.id
  AND s.source = 'key'
  AND s.plan != 'free'
  AND (
    s.key_id IS NULL
    OR NOT EXISTS (SELECT 1 FROM plan_keys pk WHERE pk.id = s.key_id)
    OR EXISTS (SELECT 1 FROM plan_keys pk WHERE pk.id = s.key_id AND pk.deactivated_at IS NOT NULL)
  )
RETURNING s.id, o.name as org_name, s.plan as was_plan;
*/

-- UNCOMMENT AND RUN THE UPDATE ABOVE TO FIX THE SUBSCRIPTIONS
