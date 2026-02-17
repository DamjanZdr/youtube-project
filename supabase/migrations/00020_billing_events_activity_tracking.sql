-- =============================================================================
-- BILLING EVENTS & ACTIVITY TRACKING
-- Track all billing events and user/org activity for admin oversight
-- =============================================================================

-- Billing Events Table - tracks every billing-related event
CREATE TABLE IF NOT EXISTS billing_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Who/What this event is for
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Who triggered the event
  
  -- Event details
  event_type TEXT NOT NULL, -- 'subscription_created', 'plan_upgraded', 'plan_downgraded', 'payment_success', 'payment_failed', 'key_redeemed', 'key_expired', 'subscription_cancelled', 'subscription_resumed'
  
  -- Plan info (for plan changes)
  previous_plan TEXT,
  new_plan TEXT,
  
  -- Payment info (for payments)
  amount_cents INTEGER, -- Amount in cents (e.g., 2900 = $29.00)
  currency TEXT DEFAULT 'usd',
  
  -- Source info
  source TEXT, -- 'stripe', 'key', 'admin'
  stripe_invoice_id TEXT,
  stripe_payment_intent_id TEXT,
  key_id UUID REFERENCES plan_keys(id) ON DELETE SET NULL,
  
  -- Billing period
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  
  -- Extra metadata
  metadata JSONB DEFAULT '{}',
  notes TEXT, -- Admin notes
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for billing_events
CREATE INDEX IF NOT EXISTS idx_billing_events_org ON billing_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_billing_events_user ON billing_events(user_id);
CREATE INDEX IF NOT EXISTS idx_billing_events_type ON billing_events(event_type);
CREATE INDEX IF NOT EXISTS idx_billing_events_created ON billing_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_billing_events_stripe_invoice ON billing_events(stripe_invoice_id) WHERE stripe_invoice_id IS NOT NULL;

-- RLS for billing_events
ALTER TABLE billing_events ENABLE ROW LEVEL SECURITY;

-- Admins can see all billing events
CREATE POLICY "Admins can manage billing events" ON billing_events
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Org owners can see their org's billing events
CREATE POLICY "Org owners can view their billing events" ON billing_events
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
  );

-- =============================================================================
-- ACTIVITY TRACKING
-- =============================================================================

-- Add last_active_at to profiles (user activity)
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ;

-- Add last_activity_at to organizations (any member activity)
ALTER TABLE organizations 
  ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ;

-- Index for activity queries
CREATE INDEX IF NOT EXISTS idx_profiles_last_active ON profiles(last_active_at DESC) WHERE last_active_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_organizations_last_activity ON organizations(last_activity_at DESC) WHERE last_activity_at IS NOT NULL;

-- Comments
COMMENT ON TABLE billing_events IS 'Tracks all billing-related events for audit and admin oversight';
COMMENT ON COLUMN profiles.last_active_at IS 'Last time this user was active on the platform';
COMMENT ON COLUMN organizations.last_activity_at IS 'Last time any member was active in this organization';

-- =============================================================================
-- HELPER FUNCTION: Log billing event
-- =============================================================================
CREATE OR REPLACE FUNCTION log_billing_event(
  p_organization_id UUID,
  p_user_id UUID,
  p_event_type TEXT,
  p_previous_plan TEXT DEFAULT NULL,
  p_new_plan TEXT DEFAULT NULL,
  p_amount_cents INTEGER DEFAULT NULL,
  p_source TEXT DEFAULT 'stripe',
  p_stripe_invoice_id TEXT DEFAULT NULL,
  p_key_id UUID DEFAULT NULL,
  p_period_start TIMESTAMPTZ DEFAULT NULL,
  p_period_end TIMESTAMPTZ DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
  v_event_id UUID;
BEGIN
  INSERT INTO billing_events (
    organization_id,
    user_id,
    event_type,
    previous_plan,
    new_plan,
    amount_cents,
    source,
    stripe_invoice_id,
    key_id,
    period_start,
    period_end,
    metadata
  ) VALUES (
    p_organization_id,
    p_user_id,
    p_event_type,
    p_previous_plan,
    p_new_plan,
    p_amount_cents,
    p_source,
    p_stripe_invoice_id,
    p_key_id,
    p_period_start,
    p_period_end,
    p_metadata
  )
  RETURNING id INTO v_event_id;
  
  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
