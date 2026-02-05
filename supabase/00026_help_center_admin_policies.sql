-- =============================================================================
-- HELP CENTER: Add Admin Policies and Delete Permissions
-- Run this in your Supabase SQL Editor
-- =============================================================================

-- First, ensure is_admin column exists in profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Drop existing update policies to recreate with admin override
DROP POLICY IF EXISTS "Users can update own threads" ON help_threads;
DROP POLICY IF EXISTS "Users can update own replies" ON help_thread_replies;
DROP POLICY IF EXISTS "Users and admins can update threads" ON help_threads;
DROP POLICY IF EXISTS "Users and admins can update replies" ON help_thread_replies;

-- Create admin-aware update policy for threads
-- Admins can update ANY thread (including official ones with NULL author_id)
-- Users can only update their own threads
CREATE POLICY "Users and admins can update threads" ON help_threads
  FOR UPDATE USING (
    (author_id IS NOT NULL AND author_id = auth.uid()) 
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() AND profiles.is_admin = TRUE
    )
  );

-- Create admin-aware update policy for replies
CREATE POLICY "Users and admins can update replies" ON help_thread_replies
  FOR UPDATE USING (
    (author_id IS NOT NULL AND author_id = auth.uid()) 
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() AND profiles.is_admin = TRUE
    )
  );

-- Add DELETE policy for threads (users own + admins)
DROP POLICY IF EXISTS "Users and admins can delete threads" ON help_threads;
CREATE POLICY "Users and admins can delete threads" ON help_threads
  FOR DELETE USING (
    (author_id IS NOT NULL AND author_id = auth.uid()) 
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() AND profiles.is_admin = TRUE
    )
  );

-- Add DELETE policy for replies (users own + admins)
DROP POLICY IF EXISTS "Users and admins can delete replies" ON help_thread_replies;
CREATE POLICY "Users and admins can delete replies" ON help_thread_replies
  FOR DELETE USING (
    (author_id IS NOT NULL AND author_id = auth.uid()) 
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() AND profiles.is_admin = TRUE
    )
  );

-- =============================================================================
-- SUPPORT TICKETS: Admin Policies
-- =============================================================================

-- Admins can view all tickets
DROP POLICY IF EXISTS "Admins can view all tickets" ON support_tickets;
CREATE POLICY "Admins can view all tickets" ON support_tickets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() AND profiles.is_admin = TRUE
    )
  );

-- Admins can update any ticket (status changes, etc.)
DROP POLICY IF EXISTS "Admins can update tickets" ON support_tickets;
CREATE POLICY "Admins can update tickets" ON support_tickets
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() AND profiles.is_admin = TRUE
    )
  );

-- Admins can view all ticket messages
DROP POLICY IF EXISTS "Admins can view all messages" ON support_ticket_messages;
CREATE POLICY "Admins can view all messages" ON support_ticket_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() AND profiles.is_admin = TRUE
    )
  );

-- Admins can add messages to any ticket
DROP POLICY IF EXISTS "Admins can add messages" ON support_ticket_messages;
CREATE POLICY "Admins can add messages" ON support_ticket_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() AND profiles.is_admin = TRUE
    )
  );

-- =============================================================================
-- Done. Run this migration to enable admin permissions.
-- =============================================================================
