-- =============================================================================
-- ORGANIZATION_MEMBERS TABLE
-- Links users to organizations with roles
-- =============================================================================
-- Last updated: 2026-01-04 (initial schema)
-- =============================================================================

CREATE TABLE organization_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'viewer',
  invited_by UUID REFERENCES profiles(id),
  joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Each user can only be a member of an organization once
  UNIQUE(organization_id, user_id)
);

-- Index for user lookups (find all orgs a user belongs to)
CREATE INDEX idx_organization_members_user ON organization_members(user_id);

-- Index for organization lookups (find all members of an org)
CREATE INDEX idx_organization_members_org ON organization_members(organization_id);
