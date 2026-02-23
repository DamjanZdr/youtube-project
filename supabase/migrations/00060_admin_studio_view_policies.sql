-- Migration: Add admin policies for silent studio viewing
-- Allows admins to view any organization and related data

-- =============================================================================
-- HELPER FUNCTION: Check if current user is admin (SECURITY DEFINER bypasses RLS)
-- =============================================================================
CREATE OR REPLACE FUNCTION is_site_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM profiles WHERE id = auth.uid()),
    false
  );
$$;

-- =============================================================================
-- CORE TABLES
-- =============================================================================
DROP POLICY IF EXISTS "Admins can view any organization" ON organizations;
CREATE POLICY "Admins can view any organization" ON organizations
  FOR SELECT TO authenticated USING (is_site_admin());

DROP POLICY IF EXISTS "Admins can view any subscription" ON subscriptions;
CREATE POLICY "Admins can view any subscription" ON subscriptions
  FOR SELECT TO authenticated USING (is_site_admin());

DROP POLICY IF EXISTS "Admins can view any membership" ON organization_members;
CREATE POLICY "Admins can view any membership" ON organization_members
  FOR SELECT TO authenticated USING (is_site_admin());

-- =============================================================================
-- CHANNELS
-- =============================================================================
DROP POLICY IF EXISTS "Admins can view any channel" ON channels;
CREATE POLICY "Admins can view any channel" ON channels
  FOR SELECT TO authenticated USING (is_site_admin());

DROP POLICY IF EXISTS "Admins can view any channel_links" ON channel_links;
CREATE POLICY "Admins can view any channel_links" ON channel_links
  FOR SELECT TO authenticated USING (is_site_admin());

DROP POLICY IF EXISTS "Admins can view any channel_brandings" ON channel_brandings;
CREATE POLICY "Admins can view any channel_brandings" ON channel_brandings
  FOR SELECT TO authenticated USING (is_site_admin());

-- =============================================================================
-- PROJECTS & RELATED
-- =============================================================================
DROP POLICY IF EXISTS "Admins can view any project" ON projects;
CREATE POLICY "Admins can view any project" ON projects
  FOR SELECT TO authenticated USING (is_site_admin());

DROP POLICY IF EXISTS "Admins can view any project_titles" ON project_titles;
CREATE POLICY "Admins can view any project_titles" ON project_titles
  FOR SELECT TO authenticated USING (is_site_admin());

DROP POLICY IF EXISTS "Admins can view any project_thumbnails" ON project_thumbnails;
CREATE POLICY "Admins can view any project_thumbnails" ON project_thumbnails
  FOR SELECT TO authenticated USING (is_site_admin());

DROP POLICY IF EXISTS "Admins can view any project_tags" ON project_tags;
CREATE POLICY "Admins can view any project_tags" ON project_tags
  FOR SELECT TO authenticated USING (is_site_admin());

DROP POLICY IF EXISTS "Admins can view any project_assignees" ON project_assignees;
CREATE POLICY "Admins can view any project_assignees" ON project_assignees
  FOR SELECT TO authenticated USING (is_site_admin());

DROP POLICY IF EXISTS "Admins can view any project_playlists" ON project_playlists;
CREATE POLICY "Admins can view any project_playlists" ON project_playlists
  FOR SELECT TO authenticated USING (is_site_admin());

DROP POLICY IF EXISTS "Admins can view any project_tasks" ON project_tasks;
CREATE POLICY "Admins can view any project_tasks" ON project_tasks
  FOR SELECT TO authenticated USING (is_site_admin());

DROP POLICY IF EXISTS "Admins can view any project_status_details" ON project_status_details;
CREATE POLICY "Admins can view any project_status_details" ON project_status_details
  FOR SELECT TO authenticated USING (is_site_admin());

-- =============================================================================
-- BOARD & STATUSES
-- =============================================================================
DROP POLICY IF EXISTS "Admins can view any board_statuses" ON board_statuses;
CREATE POLICY "Admins can view any board_statuses" ON board_statuses
  FOR SELECT TO authenticated USING (is_site_admin());

DROP POLICY IF EXISTS "Admins can view any status_default_tasks" ON status_default_tasks;
CREATE POLICY "Admins can view any status_default_tasks" ON status_default_tasks
  FOR SELECT TO authenticated USING (is_site_admin());

-- =============================================================================
-- SCRIPTS & STORYBOARD
-- =============================================================================
DROP POLICY IF EXISTS "Admins can view any scripts" ON scripts;
CREATE POLICY "Admins can view any scripts" ON scripts
  FOR SELECT TO authenticated USING (is_site_admin());

DROP POLICY IF EXISTS "Admins can view any scenes" ON scenes;
CREATE POLICY "Admins can view any scenes" ON scenes
  FOR SELECT TO authenticated USING (is_site_admin());

-- =============================================================================
-- PACKAGING
-- =============================================================================
DROP POLICY IF EXISTS "Admins can view any packaging_sets" ON packaging_sets;
CREATE POLICY "Admins can view any packaging_sets" ON packaging_sets
  FOR SELECT TO authenticated USING (is_site_admin());

-- =============================================================================
-- ASSETS
-- =============================================================================
DROP POLICY IF EXISTS "Admins can view any assets" ON assets;
CREATE POLICY "Admins can view any assets" ON assets
  FOR SELECT TO authenticated USING (is_site_admin());

-- =============================================================================
-- PLAYLISTS
-- =============================================================================
DROP POLICY IF EXISTS "Admins can view any playlists" ON playlists;
CREATE POLICY "Admins can view any playlists" ON playlists
  FOR SELECT TO authenticated USING (is_site_admin());

-- =============================================================================
-- WIKI
-- =============================================================================
DROP POLICY IF EXISTS "Admins can view any wiki_folders" ON wiki_folders;
CREATE POLICY "Admins can view any wiki_folders" ON wiki_folders
  FOR SELECT TO authenticated USING (is_site_admin());

DROP POLICY IF EXISTS "Admins can view any wiki_documents" ON wiki_documents;
CREATE POLICY "Admins can view any wiki_documents" ON wiki_documents
  FOR SELECT TO authenticated USING (is_site_admin());
