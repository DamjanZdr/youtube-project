-- Migration: Partner/Affiliate System
-- Enables tracking referrals from partners and calculating payouts

-- =============================================================================
-- PARTNERS TABLE
-- =============================================================================
CREATE TABLE partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL UNIQUE,  -- referral code (e.g., "jake", "techreview")
  name VARCHAR(255) NOT NULL,         -- display name for admin
  commission_percent INTEGER NOT NULL DEFAULT 20,  -- % of first payment
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,                         -- admin notes
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_commission CHECK (commission_percent >= 0 AND commission_percent <= 100)
);

-- Index for lookups
CREATE INDEX idx_partners_code ON partners(code);
CREATE INDEX idx_partners_user_id ON partners(user_id);

-- =============================================================================
-- PARTNER VISITS TABLE - Track page visits from referral links
-- =============================================================================
CREATE TABLE partner_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  visitor_id TEXT,                    -- anonymous identifier (from cookie/fingerprint)
  page_url TEXT,                      -- which page they landed on
  referrer_url TEXT,                  -- where they came from
  user_agent TEXT,
  ip_country VARCHAR(100),
  ip_city VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_partner_visits_partner_id ON partner_visits(partner_id);
CREATE INDEX idx_partner_visits_created_at ON partner_visits(created_at);

-- =============================================================================
-- ADD REFERRAL TRACKING TO PROFILES
-- =============================================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referred_by_partner_id UUID REFERENCES partners(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON profiles(referred_by_partner_id);

-- =============================================================================
-- PARTNER PAYOUTS TABLE - Track payment history
-- =============================================================================
CREATE TABLE partner_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  period_start DATE NOT NULL,         -- month start this covers
  period_end DATE NOT NULL,           -- month end
  status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending, paid, cancelled
  paid_at TIMESTAMPTZ,
  payment_method VARCHAR(50),         -- paypal, wise, etc.
  payment_reference TEXT,             -- transaction ID
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'paid', 'cancelled'))
);

CREATE INDEX idx_partner_payouts_partner_id ON partner_payouts(partner_id);
CREATE INDEX idx_partner_payouts_status ON partner_payouts(status);

-- =============================================================================
-- HELPER FUNCTION: Check if user is a partner
-- =============================================================================
CREATE OR REPLACE FUNCTION is_partner()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM partners 
    WHERE user_id = auth.uid() AND is_active = true
  );
$$;

-- =============================================================================
-- RLS POLICIES
-- =============================================================================
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_payouts ENABLE ROW LEVEL SECURITY;

-- Partners: Admins can do everything, partners can view their own
CREATE POLICY "Admins can manage partners" ON partners
  FOR ALL TO authenticated USING (is_site_admin());

CREATE POLICY "Partners can view own record" ON partners
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Partner visits: Admins can view all, partners can view their own
CREATE POLICY "Admins can view all visits" ON partner_visits
  FOR ALL TO authenticated USING (is_site_admin());

CREATE POLICY "Partners can view own visits" ON partner_visits
  FOR SELECT TO authenticated 
  USING (partner_id IN (SELECT id FROM partners WHERE user_id = auth.uid()));

-- Anyone can insert visits (for tracking API)
CREATE POLICY "Anyone can track visits" ON partner_visits
  FOR INSERT TO authenticated WITH CHECK (true);

-- Allow anonymous tracking (service role will insert)
CREATE POLICY "Service can insert visits" ON partner_visits
  FOR INSERT TO anon WITH CHECK (true);

-- Partner payouts: Admins can manage, partners can view their own
CREATE POLICY "Admins can manage payouts" ON partner_payouts
  FOR ALL TO authenticated USING (is_site_admin());

CREATE POLICY "Partners can view own payouts" ON partner_payouts
  FOR SELECT TO authenticated 
  USING (partner_id IN (SELECT id FROM partners WHERE user_id = auth.uid()));

-- =============================================================================
-- ADD is_partner TO PROFILES for quick access
-- =============================================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_partner BOOLEAN DEFAULT FALSE;

-- =============================================================================
-- TRIGGER: Set referred_by_partner_id when profile created with ref_code
-- =============================================================================
CREATE OR REPLACE FUNCTION public.set_partner_referral()
RETURNS TRIGGER AS $$
DECLARE
  ref_code TEXT;
  partner_uuid UUID;
BEGIN
  -- Get the ref_code from user metadata
  SELECT raw_user_meta_data->>'ref_code' INTO ref_code
  FROM auth.users WHERE id = NEW.id;
  
  -- If we have a ref code, look up the partner
  IF ref_code IS NOT NULL AND ref_code != '' THEN
    SELECT id INTO partner_uuid
    FROM partners
    WHERE code = LOWER(ref_code) AND is_active = true;
    
    -- Update the profile with the partner reference
    IF partner_uuid IS NOT NULL THEN
      UPDATE profiles
      SET referred_by_partner_id = partner_uuid
      WHERE id = NEW.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger (runs after copy_utm_to_profile)
DROP TRIGGER IF EXISTS on_profile_created_set_partner ON public.profiles;
CREATE TRIGGER on_profile_created_set_partner
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_partner_referral();
