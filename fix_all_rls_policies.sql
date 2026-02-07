-- =============================================================================
-- COMPREHENSIVE RLS FIX FOR ALL TABLES
-- Run this in Supabase SQL Editor
-- =============================================================================

-- First, ensure the helper function exists
CREATE OR REPLACE FUNCTION get_user_org_ids()
RETURNS SETOF UUID AS $$
BEGIN
  RETURN QUERY 
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    UNION
    SELECT id FROM organizations WHERE owner_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =============================================================================
-- FIX CHANNELS (Missing SELECT)
-- =============================================================================
DROP POLICY IF EXISTS "Org members can view channels" ON channels;
CREATE POLICY "Org members can view channels" ON channels
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids()));

-- =============================================================================
-- FIX CHANNEL_LINKS (Missing SELECT)
-- =============================================================================
DROP POLICY IF EXISTS "Org members can view channel links" ON channel_links;
CREATE POLICY "Org members can view channel links" ON channel_links
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM channels c WHERE c.id = channel_id AND c.organization_id IN (SELECT get_user_org_ids()))
  );

-- =============================================================================
-- FIX SUBSCRIPTIONS (Missing INSERT/UPDATE/DELETE)
-- =============================================================================
DROP POLICY IF EXISTS "Org owners can manage subscriptions" ON subscriptions;
CREATE POLICY "Org owners can manage subscriptions" ON subscriptions
  FOR ALL TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids()))
  WITH CHECK (organization_id IN (SELECT get_user_org_ids()));

-- =============================================================================
-- ASSETS
-- =============================================================================
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members can view assets" ON assets;
CREATE POLICY "Org members can view assets" ON assets
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids()));

DROP POLICY IF EXISTS "Org members can manage assets" ON assets;
CREATE POLICY "Org members can manage assets" ON assets
  FOR ALL TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids()))
  WITH CHECK (organization_id IN (SELECT get_user_org_ids()));

-- =============================================================================
-- BILLING_EVENTS (Admin only + users can view their own)
-- =============================================================================
ALTER TABLE billing_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own billing events" ON billing_events;
CREATE POLICY "Users can view own billing events" ON billing_events
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() 
    OR organization_id IN (SELECT get_user_org_ids())
  );

DROP POLICY IF EXISTS "Admins can manage billing events" ON billing_events;
CREATE POLICY "Admins can manage billing events" ON billing_events
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- =============================================================================
-- BOARD_STATUSES
-- =============================================================================
ALTER TABLE board_statuses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members can view board statuses" ON board_statuses;
CREATE POLICY "Org members can view board statuses" ON board_statuses
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids()));

DROP POLICY IF EXISTS "Org members can manage board statuses" ON board_statuses;
CREATE POLICY "Org members can manage board statuses" ON board_statuses
  FOR ALL TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids()))
  WITH CHECK (organization_id IN (SELECT get_user_org_ids()));

-- =============================================================================
-- PACKAGING_SETS
-- =============================================================================
ALTER TABLE packaging_sets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members can view packaging sets" ON packaging_sets;
CREATE POLICY "Org members can view packaging sets" ON packaging_sets
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.organization_id IN (SELECT get_user_org_ids()))
  );

DROP POLICY IF EXISTS "Org members can manage packaging sets" ON packaging_sets;
CREATE POLICY "Org members can manage packaging sets" ON packaging_sets
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.organization_id IN (SELECT get_user_org_ids()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.organization_id IN (SELECT get_user_org_ids()))
  );

-- =============================================================================
-- PLAYLISTS
-- =============================================================================
ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members can view playlists" ON playlists;
CREATE POLICY "Org members can view playlists" ON playlists
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids()));

DROP POLICY IF EXISTS "Org members can manage playlists" ON playlists;
CREATE POLICY "Org members can manage playlists" ON playlists
  FOR ALL TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids()))
  WITH CHECK (organization_id IN (SELECT get_user_org_ids()));

-- =============================================================================
-- PROJECT_ASSIGNEES
-- =============================================================================
ALTER TABLE project_assignees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members can view project assignees" ON project_assignees;
CREATE POLICY "Org members can view project assignees" ON project_assignees
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.organization_id IN (SELECT get_user_org_ids()))
  );

DROP POLICY IF EXISTS "Org members can manage project assignees" ON project_assignees;
CREATE POLICY "Org members can manage project assignees" ON project_assignees
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.organization_id IN (SELECT get_user_org_ids()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.organization_id IN (SELECT get_user_org_ids()))
  );

-- =============================================================================
-- PROJECT_PLAYLISTS
-- =============================================================================
ALTER TABLE project_playlists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members can view project playlists" ON project_playlists;
CREATE POLICY "Org members can view project playlists" ON project_playlists
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.organization_id IN (SELECT get_user_org_ids()))
  );

DROP POLICY IF EXISTS "Org members can manage project playlists" ON project_playlists;
CREATE POLICY "Org members can manage project playlists" ON project_playlists
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.organization_id IN (SELECT get_user_org_ids()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.organization_id IN (SELECT get_user_org_ids()))
  );

-- =============================================================================
-- PROJECT_STATUS_DETAILS
-- =============================================================================
ALTER TABLE project_status_details ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members can view project status details" ON project_status_details;
CREATE POLICY "Org members can view project status details" ON project_status_details
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.organization_id IN (SELECT get_user_org_ids()))
  );

DROP POLICY IF EXISTS "Org members can manage project status details" ON project_status_details;
CREATE POLICY "Org members can manage project status details" ON project_status_details
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.organization_id IN (SELECT get_user_org_ids()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.organization_id IN (SELECT get_user_org_ids()))
  );

-- =============================================================================
-- PROJECT_TAGS
-- =============================================================================
ALTER TABLE project_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members can view project tags" ON project_tags;
CREATE POLICY "Org members can view project tags" ON project_tags
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.organization_id IN (SELECT get_user_org_ids()))
  );

DROP POLICY IF EXISTS "Org members can manage project tags" ON project_tags;
CREATE POLICY "Org members can manage project tags" ON project_tags
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.organization_id IN (SELECT get_user_org_ids()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.organization_id IN (SELECT get_user_org_ids()))
  );

-- =============================================================================
-- PROJECT_TASKS
-- =============================================================================
ALTER TABLE project_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members can view project tasks" ON project_tasks;
CREATE POLICY "Org members can view project tasks" ON project_tasks
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.organization_id IN (SELECT get_user_org_ids()))
  );

DROP POLICY IF EXISTS "Org members can manage project tasks" ON project_tasks;
CREATE POLICY "Org members can manage project tasks" ON project_tasks
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.organization_id IN (SELECT get_user_org_ids()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.organization_id IN (SELECT get_user_org_ids()))
  );

-- =============================================================================
-- PROJECT_THUMBNAILS
-- =============================================================================
ALTER TABLE project_thumbnails ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members can view project thumbnails" ON project_thumbnails;
CREATE POLICY "Org members can view project thumbnails" ON project_thumbnails
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.organization_id IN (SELECT get_user_org_ids()))
  );

DROP POLICY IF EXISTS "Org members can manage project thumbnails" ON project_thumbnails;
CREATE POLICY "Org members can manage project thumbnails" ON project_thumbnails
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.organization_id IN (SELECT get_user_org_ids()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.organization_id IN (SELECT get_user_org_ids()))
  );

-- =============================================================================
-- PROJECT_TITLES
-- =============================================================================
ALTER TABLE project_titles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members can view project titles" ON project_titles;
CREATE POLICY "Org members can view project titles" ON project_titles
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.organization_id IN (SELECT get_user_org_ids()))
  );

DROP POLICY IF EXISTS "Org members can manage project titles" ON project_titles;
CREATE POLICY "Org members can manage project titles" ON project_titles
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.organization_id IN (SELECT get_user_org_ids()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.organization_id IN (SELECT get_user_org_ids()))
  );

-- =============================================================================
-- PROJECT_WHITEBOARD_ELEMENTS
-- =============================================================================
ALTER TABLE project_whiteboard_elements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members can view whiteboard elements" ON project_whiteboard_elements;
CREATE POLICY "Org members can view whiteboard elements" ON project_whiteboard_elements
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.organization_id IN (SELECT get_user_org_ids()))
  );

DROP POLICY IF EXISTS "Org members can manage whiteboard elements" ON project_whiteboard_elements;
CREATE POLICY "Org members can manage whiteboard elements" ON project_whiteboard_elements
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.organization_id IN (SELECT get_user_org_ids()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.organization_id IN (SELECT get_user_org_ids()))
  );

-- =============================================================================
-- PROJECT_WHITEBOARD_CONNECTIONS
-- =============================================================================
ALTER TABLE project_whiteboard_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members can view whiteboard connections" ON project_whiteboard_connections;
CREATE POLICY "Org members can view whiteboard connections" ON project_whiteboard_connections
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.organization_id IN (SELECT get_user_org_ids()))
  );

DROP POLICY IF EXISTS "Org members can manage whiteboard connections" ON project_whiteboard_connections;
CREATE POLICY "Org members can manage whiteboard connections" ON project_whiteboard_connections
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.organization_id IN (SELECT get_user_org_ids()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.organization_id IN (SELECT get_user_org_ids()))
  );

-- =============================================================================
-- SCENES
-- =============================================================================
ALTER TABLE scenes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members can view scenes" ON scenes;
CREATE POLICY "Org members can view scenes" ON scenes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM scripts s 
      JOIN projects p ON p.id = s.project_id 
      WHERE s.id = script_id AND p.organization_id IN (SELECT get_user_org_ids())
    )
  );

DROP POLICY IF EXISTS "Org members can manage scenes" ON scenes;
CREATE POLICY "Org members can manage scenes" ON scenes
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM scripts s 
      JOIN projects p ON p.id = s.project_id 
      WHERE s.id = script_id AND p.organization_id IN (SELECT get_user_org_ids())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM scripts s 
      JOIN projects p ON p.id = s.project_id 
      WHERE s.id = script_id AND p.organization_id IN (SELECT get_user_org_ids())
    )
  );

-- =============================================================================
-- SCRIPTS
-- =============================================================================
ALTER TABLE scripts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members can view scripts" ON scripts;
CREATE POLICY "Org members can view scripts" ON scripts
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.organization_id IN (SELECT get_user_org_ids()))
  );

DROP POLICY IF EXISTS "Org members can manage scripts" ON scripts;
CREATE POLICY "Org members can manage scripts" ON scripts
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.organization_id IN (SELECT get_user_org_ids()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.organization_id IN (SELECT get_user_org_ids()))
  );

-- =============================================================================
-- STATUS_DEFAULT_TASKS
-- =============================================================================
ALTER TABLE status_default_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members can view default tasks" ON status_default_tasks;
CREATE POLICY "Org members can view default tasks" ON status_default_tasks
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM board_statuses bs 
      WHERE bs.id = status_id AND bs.organization_id IN (SELECT get_user_org_ids())
    )
  );

DROP POLICY IF EXISTS "Org members can manage default tasks" ON status_default_tasks;
CREATE POLICY "Org members can manage default tasks" ON status_default_tasks
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM board_statuses bs 
      WHERE bs.id = status_id AND bs.organization_id IN (SELECT get_user_org_ids())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM board_statuses bs 
      WHERE bs.id = status_id AND bs.organization_id IN (SELECT get_user_org_ids())
    )
  );

-- =============================================================================
-- SUPPORT_TICKETS
-- =============================================================================
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own tickets" ON support_tickets;
CREATE POLICY "Users can view own tickets" ON support_tickets
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create tickets" ON support_tickets;
CREATE POLICY "Users can create tickets" ON support_tickets
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own tickets" ON support_tickets;
CREATE POLICY "Users can update own tickets" ON support_tickets
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage all tickets" ON support_tickets;
CREATE POLICY "Admins can manage all tickets" ON support_tickets
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- =============================================================================
-- SUPPORT_TICKET_MESSAGES
-- =============================================================================
ALTER TABLE support_ticket_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view messages on own tickets" ON support_ticket_messages;
CREATE POLICY "Users can view messages on own tickets" ON support_ticket_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM support_tickets t WHERE t.id = ticket_id AND t.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

DROP POLICY IF EXISTS "Users can send messages on own tickets" ON support_ticket_messages;
CREATE POLICY "Users can send messages on own tickets" ON support_ticket_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM support_tickets t WHERE t.id = ticket_id AND t.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- =============================================================================
-- WIKI_FOLDERS
-- =============================================================================
ALTER TABLE wiki_folders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members can view wiki folders" ON wiki_folders;
CREATE POLICY "Org members can view wiki folders" ON wiki_folders
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids()));

DROP POLICY IF EXISTS "Org members can manage wiki folders" ON wiki_folders;
CREATE POLICY "Org members can manage wiki folders" ON wiki_folders
  FOR ALL TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids()))
  WITH CHECK (organization_id IN (SELECT get_user_org_ids()));

-- =============================================================================
-- WIKI_DOCUMENTS
-- =============================================================================
ALTER TABLE wiki_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members can view wiki documents" ON wiki_documents;
CREATE POLICY "Org members can view wiki documents" ON wiki_documents
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids()));

DROP POLICY IF EXISTS "Org members can manage wiki documents" ON wiki_documents;
CREATE POLICY "Org members can manage wiki documents" ON wiki_documents
  FOR ALL TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids()))
  WITH CHECK (organization_id IN (SELECT get_user_org_ids()));

-- =============================================================================
-- YOUTUBE_CONNECTIONS
-- =============================================================================
ALTER TABLE youtube_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members can view youtube connections" ON youtube_connections;
CREATE POLICY "Org members can view youtube connections" ON youtube_connections
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids()));

DROP POLICY IF EXISTS "Org members can manage youtube connections" ON youtube_connections;
CREATE POLICY "Org members can manage youtube connections" ON youtube_connections
  FOR ALL TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids()))
  WITH CHECK (organization_id IN (SELECT get_user_org_ids()));

-- =============================================================================
-- HELP_CATEGORIES (Public read)
-- =============================================================================
ALTER TABLE help_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view help categories" ON help_categories;
CREATE POLICY "Anyone can view help categories" ON help_categories
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage help categories" ON help_categories;
CREATE POLICY "Admins can manage help categories" ON help_categories
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- =============================================================================
-- HELP_THREADS (Public read)
-- =============================================================================
ALTER TABLE help_threads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view help threads" ON help_threads;
CREATE POLICY "Anyone can view help threads" ON help_threads
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can create help threads" ON help_threads;
CREATE POLICY "Authenticated users can create help threads" ON help_threads
  FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own threads" ON help_threads;
CREATE POLICY "Users can update own threads" ON help_threads
  FOR UPDATE TO authenticated
  USING (author_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- =============================================================================
-- HELP_THREAD_REPLIES (Public read)
-- =============================================================================
ALTER TABLE help_thread_replies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view help thread replies" ON help_thread_replies;
CREATE POLICY "Anyone can view help thread replies" ON help_thread_replies
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can create replies" ON help_thread_replies;
CREATE POLICY "Authenticated users can create replies" ON help_thread_replies
  FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own replies" ON help_thread_replies;
CREATE POLICY "Users can update own replies" ON help_thread_replies
  FOR UPDATE TO authenticated
  USING (author_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- =============================================================================
-- VERIFICATION: Run this after to check everything is fixed
-- =============================================================================
SELECT 
  tablename,
  COUNT(*) as policy_count,
  bool_or(cmd = 'SELECT' OR cmd = 'ALL') as has_select,
  bool_or(cmd = 'INSERT' OR cmd = 'ALL') as has_insert,
  bool_or(cmd = 'UPDATE' OR cmd = 'ALL') as has_update,
  bool_or(cmd = 'DELETE' OR cmd = 'ALL') as has_delete
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;
