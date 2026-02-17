-- =============================================================================
-- BACKFILL FREE SUBSCRIPTIONS
-- Create subscription records for organizations that don't have one
-- =============================================================================

-- Insert a free subscription for every organization that doesn't have one
INSERT INTO subscriptions (organization_id, plan, status, source, interval)
SELECT 
  o.id,
  'free',
  'active',
  NULL,
  NULL
FROM organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM subscriptions s WHERE s.organization_id = o.id
);

-- Show count of what was created
DO $$
DECLARE
  count_created INTEGER;
BEGIN
  SELECT COUNT(*) INTO count_created
  FROM subscriptions 
  WHERE plan = 'free' AND source IS NULL;
  
  RAISE NOTICE 'Total free subscriptions now: %', count_created;
END $$;
