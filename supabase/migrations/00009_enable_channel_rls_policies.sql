-- =============================================================================
-- ENABLE RLS POLICIES FOR CHANNELS AND CHANNEL_LINKS
-- =============================================================================
-- This migration enables INSERT, UPDATE, and DELETE policies for channels 
-- and channel_links tables that were previously commented out
-- Run this in Supabase SQL Editor

-- ============================================================================
-- CHANNELS TABLE POLICIES
-- ============================================================================

-- Admins/owners can create channels
DROP POLICY IF EXISTS "Admins can create channels" ON channels;
CREATE POLICY "Admins can create channels" ON channels
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Admins/owners can update channels
DROP POLICY IF EXISTS "Admins can update channels" ON channels;
CREATE POLICY "Admins can update channels" ON channels
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Admins/owners can delete channels
DROP POLICY IF EXISTS "Admins can delete channels" ON channels;
CREATE POLICY "Admins can delete channels" ON channels
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- ============================================================================
-- CHANNEL_LINKS TABLE POLICIES
-- ============================================================================

-- Admins can manage channel links (INSERT, UPDATE, DELETE)
DROP POLICY IF EXISTS "Admins can insert channel links" ON channel_links;
CREATE POLICY "Admins can insert channel links" ON channel_links
  FOR INSERT WITH CHECK (
    channel_id IN (
      SELECT id FROM channels WHERE organization_id IN (
        SELECT organization_id FROM organization_members 
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
      )
    )
  );

DROP POLICY IF EXISTS "Admins can update channel links" ON channel_links;
CREATE POLICY "Admins can update channel links" ON channel_links
  FOR UPDATE USING (
    channel_id IN (
      SELECT id FROM channels WHERE organization_id IN (
        SELECT organization_id FROM organization_members 
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
      )
    )
  );

DROP POLICY IF EXISTS "Admins can delete channel links" ON channel_links;
CREATE POLICY "Admins can delete channel links" ON channel_links
  FOR DELETE USING (
    channel_id IN (
      SELECT id FROM channels WHERE organization_id IN (
        SELECT organization_id FROM organization_members 
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
      )
    )
  );

-- ============================================================================
-- ADD TITLE COLUMN TO CHANNEL_LINKS (if not exists)
-- ============================================================================
-- The channel_links table schema has 'platform' but the app uses 'title'
-- We'll add title column to support both

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'channel_links' AND column_name = 'title'
  ) THEN
    ALTER TABLE channel_links ADD COLUMN title TEXT;
  END IF;
END $$;

-- ============================================================================
-- ADD SUBSCRIBER AND VIDEO COUNT COLUMNS TO CHANNELS (if not exists)
-- ============================================================================
-- Store subscriber and video counts for channel preview

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'channels' AND column_name = 'subscriber_count'
  ) THEN
    ALTER TABLE channels ADD COLUMN subscriber_count INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'channels' AND column_name = 'video_count'
  ) THEN
    ALTER TABLE channels ADD COLUMN video_count INTEGER DEFAULT 0;
  END IF;
END $$;
