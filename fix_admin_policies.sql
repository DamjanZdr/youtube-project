-- =============================================================================
-- QUICK FIX: Update Help Center Policies for NULL author_id
-- Run this to fix admin access to official articles
-- =============================================================================

-- Drop and recreate thread update policy
DROP POLICY IF EXISTS "Users and admins can update threads" ON help_threads;
CREATE POLICY "Users and admins can update threads" ON help_threads
  FOR UPDATE USING (
    (author_id IS NOT NULL AND author_id = auth.uid()) 
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() AND profiles.is_admin = TRUE
    )
  );

-- Drop and recreate thread delete policy
DROP POLICY IF EXISTS "Users and admins can delete threads" ON help_threads;
CREATE POLICY "Users and admins can delete threads" ON help_threads
  FOR DELETE USING (
    (author_id IS NOT NULL AND author_id = auth.uid()) 
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() AND profiles.is_admin = TRUE
    )
  );

-- Drop and recreate reply update policy
DROP POLICY IF EXISTS "Users and admins can update replies" ON help_thread_replies;
CREATE POLICY "Users and admins can update replies" ON help_thread_replies
  FOR UPDATE USING (
    (author_id IS NOT NULL AND author_id = auth.uid()) 
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() AND profiles.is_admin = TRUE
    )
  );

-- Drop and recreate reply delete policy
DROP POLICY IF EXISTS "Users and admins can delete replies" ON help_thread_replies;
CREATE POLICY "Users and admins can delete replies" ON help_thread_replies
  FOR DELETE USING (
    (author_id IS NOT NULL AND author_id = auth.uid()) 
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() AND profiles.is_admin = TRUE
    )
  );

-- Verify your user is admin (replace YOUR_USER_ID with your actual user ID)
-- SELECT id, email, is_admin FROM profiles WHERE id = 'YOUR_USER_ID';

-- If you need to make yourself admin:
-- UPDATE profiles SET is_admin = TRUE WHERE email = 'your-email@example.com';
