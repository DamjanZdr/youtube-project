-- =============================================================================
-- ORGANIZATION PENDING STATUS
-- Support creating studios in "pending" state during paid plan checkout
-- =============================================================================

-- Add status column to organizations
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('pending', 'active'));

-- Set all existing organizations to active
UPDATE organizations SET status = 'active' WHERE status IS NULL;

-- Index for querying by status
CREATE INDEX IF NOT EXISTS idx_organizations_status ON organizations(status);

-- Update free tier limit check to ignore pending organizations
-- Pending orgs don't count toward free tier limits since they're awaiting payment
CREATE OR REPLACE FUNCTION check_free_tier_limit()
RETURNS TRIGGER AS $$
DECLARE
  user_free_org_count INTEGER;
  org_plan subscription_plan;
  org_status TEXT;
BEGIN
  -- Get the organization's subscription plan and status
  SELECT COALESCE(s.plan, 'free'), o.status INTO org_plan, org_status
  FROM organizations o
  LEFT JOIN subscriptions s ON s.organization_id = o.id AND s.status = 'active'
  WHERE o.id = NEW.organization_id;

  -- Pending organizations don't count toward free tier limit
  -- They're awaiting payment and will either become paid or be deleted
  IF org_status = 'pending' THEN
    RETURN NEW;
  END IF;

  -- Only enforce limit for free tier organizations
  IF org_plan = 'free' THEN
    -- Count how many free tier active organizations the user is already part of
    SELECT COUNT(*) INTO user_free_org_count
    FROM organization_members om
    JOIN organizations o ON o.id = om.organization_id
    LEFT JOIN subscriptions s ON s.organization_id = o.id AND s.status = 'active'
    WHERE om.user_id = NEW.user_id
      AND om.organization_id != NEW.organization_id -- Exclude current org if updating
      AND o.status = 'active' -- Only count active organizations
      AND COALESCE(s.plan, 'free') = 'free';

    -- Raise error if user is already in a free tier organization
    IF user_free_org_count > 0 THEN
      RAISE EXCEPTION 'You can only be a member of one free tier organization. Please upgrade your current organization or leave it first.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Comment explaining the status column
COMMENT ON COLUMN organizations.status IS 'Organization status: pending (awaiting payment) or active. Pending orgs bypass free tier limits.';
