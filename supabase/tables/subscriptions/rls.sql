-- =============================================================================
-- SUBSCRIPTIONS - Row Level Security Policies
-- =============================================================================
-- Last updated: 2026-01-04 (initial schema)
-- =============================================================================

-- Enable RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Organization members can view their subscription
CREATE POLICY "Organization members can view subscription" ON subscriptions
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- Note: Subscription INSERT/UPDATE/DELETE should only be done via 
-- server-side code (webhooks) with service role key, not via RLS policies.
-- This ensures billing data integrity.

-- If you need owner-only access for viewing detailed billing info:
-- CREATE POLICY "Owners can view subscription details" ON subscriptions
--   FOR SELECT USING (
--     organization_id IN (
--       SELECT organization_id FROM organization_members 
--       WHERE user_id = auth.uid() AND role = 'owner'
--     )
--   );
