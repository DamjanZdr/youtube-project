-- =============================================================================
-- FREE TIER ABUSE PREVENTION
-- Track project initiations and enforce free tier limits
-- =============================================================================
-- Created: 2026-01-16
-- =============================================================================

-- Add project_initiations_count to organizations table
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS project_initiations_count INTEGER DEFAULT 0 NOT NULL;

-- Add comment to explain the column
COMMENT ON COLUMN organizations.project_initiations_count IS 
'Tracks total number of projects ever created (not decremented on delete). Used to enforce free tier limits.';

-- Create function to increment project initiations counter
CREATE OR REPLACE FUNCTION increment_project_initiations()
RETURNS TRIGGER AS $$
BEGIN
  -- Increment the counter when a new project is created
  UPDATE organizations 
  SET project_initiations_count = project_initiations_count + 1
  WHERE id = NEW.organization_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-increment counter on project creation
DROP TRIGGER IF EXISTS trigger_increment_project_initiations ON projects;
CREATE TRIGGER trigger_increment_project_initiations
  AFTER INSERT ON projects
  FOR EACH ROW
  EXECUTE FUNCTION increment_project_initiations();

-- Create function to check if user can join/create free tier organization
CREATE OR REPLACE FUNCTION check_free_tier_limit()
RETURNS TRIGGER AS $$
DECLARE
  user_free_org_count INTEGER;
  org_plan subscription_plan;
BEGIN
  -- Get the organization's subscription plan
  SELECT COALESCE(s.plan, 'free') INTO org_plan
  FROM organizations o
  LEFT JOIN subscriptions s ON s.organization_id = o.id AND s.status = 'active'
  WHERE o.id = NEW.organization_id;

  -- Only enforce limit for free tier organizations
  IF org_plan = 'free' THEN
    -- Count how many free tier organizations the user is already part of
    SELECT COUNT(*) INTO user_free_org_count
    FROM organization_members om
    JOIN organizations o ON o.id = om.organization_id
    LEFT JOIN subscriptions s ON s.organization_id = o.id AND s.status = 'active'
    WHERE om.user_id = NEW.user_id
      AND om.organization_id != NEW.organization_id -- Exclude current org if updating
      AND COALESCE(s.plan, 'free') = 'free';

    -- Raise error if user is already in a free tier organization
    IF user_free_org_count > 0 THEN
      RAISE EXCEPTION 'You can only be a member of one free tier organization. Please upgrade your current organization or leave it first.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce free tier limit on organization member creation
DROP TRIGGER IF EXISTS trigger_check_free_tier_limit ON organization_members;
CREATE TRIGGER trigger_check_free_tier_limit
  BEFORE INSERT ON organization_members
  FOR EACH ROW
  EXECUTE FUNCTION check_free_tier_limit();

-- Create function to validate project creation against limits
CREATE OR REPLACE FUNCTION check_project_creation_limit()
RETURNS TRIGGER AS $$
DECLARE
  org_plan subscription_plan;
  current_initiations INTEGER;
  plan_limit INTEGER;
BEGIN
  -- Get organization's subscription plan and initiation count
  SELECT 
    COALESCE(s.plan, 'free'),
    o.project_initiations_count
  INTO org_plan, current_initiations
  FROM organizations o
  LEFT JOIN subscriptions s ON s.organization_id = o.id AND s.status = 'active'
  WHERE o.id = NEW.organization_id;

  -- Set limits based on plan
  plan_limit := CASE org_plan
    WHEN 'free' THEN 1
    WHEN 'creator' THEN 10
    WHEN 'studio' THEN 999999 -- Unlimited
    ELSE 1
  END;

  -- Check if limit would be exceeded
  IF current_initiations >= plan_limit THEN
    RAISE EXCEPTION 'Project creation limit reached for % plan (% projects). Upgrade to create more projects.', 
      org_plan, plan_limit;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce project creation limits
DROP TRIGGER IF EXISTS trigger_check_project_creation_limit ON projects;
CREATE TRIGGER trigger_check_project_creation_limit
  BEFORE INSERT ON projects
  FOR EACH ROW
  EXECUTE FUNCTION check_project_creation_limit();

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_organizations_project_initiations 
  ON organizations(project_initiations_count);

-- Backfill existing organizations with current project counts
UPDATE organizations o
SET project_initiations_count = (
  SELECT COUNT(*)
  FROM projects p
  WHERE p.organization_id = o.id
)
WHERE project_initiations_count = 0;

COMMENT ON COLUMN organizations.project_initiations_count IS 
'Total projects ever created (lifetime). Not decremented on deletion. Free tier: 1, Creator: 10, Studio: unlimited';
