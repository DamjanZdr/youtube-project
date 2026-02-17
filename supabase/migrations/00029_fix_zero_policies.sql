-- =============================================================================
-- FIX TABLES WITH 0 POLICIES
-- These tables have RLS enabled but no policies, so they're completely locked
-- =============================================================================

-- =============================================================================
-- PROFILES POLICIES
-- =============================================================================
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Members can view teammate profiles" ON profiles
  FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT om.user_id FROM organization_members om
      WHERE om.organization_id IN (SELECT get_user_org_ids())
    )
  );

-- =============================================================================
-- ORGANIZATIONS POLICIES
-- =============================================================================
CREATE POLICY "Owners can view their organizations" ON organizations
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Members can view organizations" ON organizations
  FOR SELECT TO authenticated
  USING (is_org_member(id));

CREATE POLICY "Users can create organizations" ON organizations
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can update organizations" ON organizations
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Owners can delete organizations" ON organizations
  FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

-- =============================================================================
-- ORGANIZATION MEMBERS POLICIES
-- =============================================================================
CREATE POLICY "Users can view their own memberships" ON organization_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Owners can view all org members" ON organization_members
  FOR SELECT TO authenticated
  USING (is_org_owner(organization_id));

CREATE POLICY "Owners can add members" ON organization_members
  FOR INSERT TO authenticated
  WITH CHECK (is_org_owner(organization_id));

CREATE POLICY "Owners can update members" ON organization_members
  FOR UPDATE TO authenticated
  USING (is_org_owner(organization_id));

CREATE POLICY "Owners can remove members" ON organization_members
  FOR DELETE TO authenticated
  USING (is_org_owner(organization_id));

CREATE POLICY "Users can leave orgs" ON organization_members
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- =============================================================================
-- CHANNEL BRANDINGS POLICIES
-- =============================================================================
CREATE POLICY "Org members can view channel brandings" ON channel_brandings
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM channels c WHERE c.id = channel_id AND c.organization_id IN (SELECT get_user_org_ids()))
  );

CREATE POLICY "Org members can manage channel brandings" ON channel_brandings
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM channels c WHERE c.id = channel_id AND c.organization_id IN (SELECT get_user_org_ids()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM channels c WHERE c.id = channel_id AND c.organization_id IN (SELECT get_user_org_ids()))
  );

-- =============================================================================
-- PLAYLISTS POLICIES
-- =============================================================================
CREATE POLICY "Org members can view playlists" ON playlists
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids()));

CREATE POLICY "Org members can manage playlists" ON playlists
  FOR ALL TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids()))
  WITH CHECK (organization_id IN (SELECT get_user_org_ids()));

-- =============================================================================
-- PROJECTS POLICIES
-- =============================================================================
CREATE POLICY "Org members can view projects" ON projects
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids()));

CREATE POLICY "Org members can manage projects" ON projects
  FOR ALL TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids()))
  WITH CHECK (organization_id IN (SELECT get_user_org_ids()));

-- =============================================================================
-- PROJECT PLAYLISTS POLICIES
-- =============================================================================
CREATE POLICY "Org members can view project playlists" ON project_playlists
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.organization_id IN (SELECT get_user_org_ids()))
  );

CREATE POLICY "Org members can manage project playlists" ON project_playlists
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.organization_id IN (SELECT get_user_org_ids()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.organization_id IN (SELECT get_user_org_ids()))
  );

-- =============================================================================
-- PROJECT ASSIGNEES POLICIES
-- =============================================================================
CREATE POLICY "Org members can view project assignees" ON project_assignees
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.organization_id IN (SELECT get_user_org_ids()))
  );

CREATE POLICY "Org members can manage project assignees" ON project_assignees
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.organization_id IN (SELECT get_user_org_ids()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.organization_id IN (SELECT get_user_org_ids()))
  );

-- =============================================================================
-- PROJECT TITLES POLICIES
-- =============================================================================
CREATE POLICY "Org members can view project titles" ON project_titles
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.organization_id IN (SELECT get_user_org_ids()))
  );

CREATE POLICY "Org members can manage project titles" ON project_titles
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.organization_id IN (SELECT get_user_org_ids()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.organization_id IN (SELECT get_user_org_ids()))
  );

-- =============================================================================
-- PROJECT THUMBNAILS POLICIES
-- =============================================================================
CREATE POLICY "Org members can view project thumbnails" ON project_thumbnails
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.organization_id IN (SELECT get_user_org_ids()))
  );

CREATE POLICY "Org members can manage project thumbnails" ON project_thumbnails
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.organization_id IN (SELECT get_user_org_ids()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.organization_id IN (SELECT get_user_org_ids()))
  );

-- =============================================================================
-- PROJECT TAGS POLICIES
-- =============================================================================
CREATE POLICY "Org members can view project tags" ON project_tags
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.organization_id IN (SELECT get_user_org_ids()))
  );

CREATE POLICY "Org members can manage project tags" ON project_tags
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.organization_id IN (SELECT get_user_org_ids()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.organization_id IN (SELECT get_user_org_ids()))
  );

-- =============================================================================
-- SCRIPTS POLICIES
-- =============================================================================
CREATE POLICY "Org members can view scripts" ON scripts
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.organization_id IN (SELECT get_user_org_ids()))
  );

CREATE POLICY "Org members can manage scripts" ON scripts
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.organization_id IN (SELECT get_user_org_ids()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.organization_id IN (SELECT get_user_org_ids()))
  );

-- =============================================================================
-- SCENES POLICIES
-- =============================================================================
CREATE POLICY "Org members can view scenes" ON scenes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM scripts s 
      JOIN projects p ON p.id = s.project_id 
      WHERE s.id = script_id AND p.organization_id IN (SELECT get_user_org_ids())
    )
  );

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
-- ASSETS POLICIES
-- =============================================================================
CREATE POLICY "Org members can view assets" ON assets
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids()));

CREATE POLICY "Org members can manage assets" ON assets
  FOR ALL TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids()))
  WITH CHECK (organization_id IN (SELECT get_user_org_ids()));

-- =============================================================================
-- SUBSCRIPTIONS POLICIES
-- =============================================================================
CREATE POLICY "Org members can view subscriptions" ON subscriptions
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids()));

-- =============================================================================
-- WIKI FOLDERS POLICIES
-- =============================================================================
CREATE POLICY "Org members can view wiki folders" ON wiki_folders
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids()));

CREATE POLICY "Org members can manage wiki folders" ON wiki_folders
  FOR ALL TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids()))
  WITH CHECK (organization_id IN (SELECT get_user_org_ids()));

-- =============================================================================
-- WIKI DOCUMENTS POLICIES
-- =============================================================================
CREATE POLICY "Org members can view wiki documents" ON wiki_documents
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids()));

CREATE POLICY "Org members can manage wiki documents" ON wiki_documents
  FOR ALL TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids()))
  WITH CHECK (organization_id IN (SELECT get_user_org_ids()));

-- =============================================================================
-- DONE! Run this to add policies to the 17 tables that have 0 policies.
-- =============================================================================
