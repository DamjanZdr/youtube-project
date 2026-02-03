-- Plan Keys table for redemption codes
-- Run this if the table doesn't exist

CREATE TABLE IF NOT EXISTS plan_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT UNIQUE NOT NULL,
  plan_type TEXT NOT NULL, -- 'creator', 'studio', 'enterprise', or 'lifetime' for duration
  assigned_org_id UUID REFERENCES organizations(id) ON DELETE SET NULL, -- Optional: pre-assign to specific org
  redeemed_org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  redeemed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  redeemed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ, -- For cron job idempotency
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_plan_keys_key ON plan_keys(key);
CREATE INDEX IF NOT EXISTS idx_plan_keys_redeemed ON plan_keys(redeemed_at);

-- RLS Policies
ALTER TABLE plan_keys ENABLE ROW LEVEL SECURITY;

-- Allow admins to manage keys (insert, select, delete)
CREATE POLICY "Admins can manage plan keys" ON plan_keys
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Allow users to read their redeemed keys
CREATE POLICY "Users can view their redeemed keys" ON plan_keys
  FOR SELECT
  TO authenticated
  USING (redeemed_by = auth.uid());
