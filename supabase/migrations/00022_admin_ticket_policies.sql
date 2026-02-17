-- =============================================================================
-- ADD ADMIN POLICIES FOR SUPPORT TICKETS
-- Run this in your Supabase SQL Editor
-- =============================================================================

-- Admins can view ALL tickets
CREATE POLICY "Admins can view all tickets" ON support_tickets
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admins can update any ticket (change status, resolve, etc.)
CREATE POLICY "Admins can update tickets" ON support_tickets
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admins can view ALL ticket messages
CREATE POLICY "Admins can view all ticket messages" ON support_ticket_messages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admins can add messages to any ticket (as admin replies)
CREATE POLICY "Admins can add messages to any ticket" ON support_ticket_messages
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    AND is_admin = TRUE
  );
