-- =============================================================================
-- INVITE SYSTEM MIGRATION
-- Adds invite preferences and pending invite status
-- =============================================================================
-- Created: 2026-01-15
-- =============================================================================

-- Add accept_invites column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS accept_invites BOOLEAN DEFAULT true NOT NULL;

-- Create enum for member status
DO $$ BEGIN
  CREATE TYPE member_status AS ENUM ('pending', 'active');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add status column to organization_members table
ALTER TABLE organization_members 
ADD COLUMN IF NOT EXISTS status member_status DEFAULT 'active' NOT NULL;

-- Create index for pending invites
CREATE INDEX IF NOT EXISTS idx_organization_members_status 
ON organization_members(status) WHERE status = 'pending';

-- Create index for user invite preferences
CREATE INDEX IF NOT EXISTS idx_profiles_accept_invites 
ON profiles(accept_invites) WHERE accept_invites = true;
