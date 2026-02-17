-- =============================================================================
-- OWNERSHIP TRANSFER MIGRATION
-- Adds support for ownership transfer invites
-- =============================================================================
-- Created: 2026-01-15
-- =============================================================================

-- Add is_transfer column to organization_members table
ALTER TABLE organization_members 
ADD COLUMN IF NOT EXISTS is_transfer BOOLEAN DEFAULT false NOT NULL;

-- Create index for transfer invites
CREATE INDEX IF NOT EXISTS idx_organization_members_transfer 
ON organization_members(is_transfer) WHERE is_transfer = true AND status = 'pending';
