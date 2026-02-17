-- =============================================================================
-- COMPREHENSIVE RLS FIX - Based on actual tables in database
-- Tables from screenshot: assets, billing_events, board_statuses, channel_brandings,
-- channel_links, channels, help_categories, help_thread_replies, help_threads,
-- organization_members, organizations, packaging_sets, plan_keys, playlists,
-- profiles, project_assignees, project_playlists, project_status_details,
-- project_tags, project_tasks, project_thumbnails, project_titles,
-- project_whiteboard_connections, project_whiteboard_elements, projects, scenes,
-- scripts, status_default_tasks, subscriptions, support_ticket_messages,
-- support_tickets, wiki_documents, wiki_folders, youtube_connections
-- =============================================================================

-- =============================================================================
-- STEP 1: DROP ALL EXISTING POLICIES
-- =============================================================================

-- Profiles
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Members can view teammate profiles" ON profiles;

-- Organizations
DROP POLICY IF EXISTS "Owners can view their organizations" ON organizations;
DROP POLICY IF EXISTS "Members can view organizations" ON organizations;
DROP POLICY IF EXISTS "Users can create organizations" ON organizations;
DROP POLICY IF EXISTS "Owners can update organizations" ON organizations;
DROP POLICY IF EXISTS "Owners can delete organizations" ON organizations;

-- Organization Members
DROP POLICY IF EXISTS "Users can view their own memberships" ON organization_members;
DROP POLICY IF EXISTS "Owners can view all org members" ON organization_members;
DROP POLICY IF EXISTS "Owners can add members" ON organization_members;
DROP POLICY IF EXISTS "Owners can update members" ON organization_members;
DROP POLICY IF EXISTS "Owners can remove members" ON organization_members;
DROP POLICY IF EXISTS "Users can leave orgs" ON organization_members;

-- Channels
DROP POLICY IF EXISTS "Org members can view channels" ON channels;
DROP POLICY IF EXISTS "Org owners can manage channels" ON channels;
DROP POLICY IF EXISTS "Org members can manage channels" ON channels;

-- Channel Brandings
DROP POLICY IF EXISTS "Org members can view channel brandings" ON channel_brandings;
DROP POLICY IF EXISTS "Org owners can manage channel brandings" ON channel_brandings;
DROP POLICY IF EXISTS "Org members can manage channel brandings" ON channel_brandings;
DROP POLICY IF EXISTS "Organization members can view channel branding" ON channel_brandings;

-- Channel Links
DROP POLICY IF EXISTS "Org members can view channel links" ON channel_links;
DROP POLICY IF EXISTS "Org owners can manage channel links" ON channel_links;
DROP POLICY IF EXISTS "Org members can manage channel links" ON channel_links;

-- Playlists
DROP POLICY IF EXISTS "Org members can view playlists" ON playlists;
DROP POLICY IF EXISTS "Org owners can manage playlists" ON playlists;
DROP POLICY IF EXISTS "Org members can manage playlists" ON playlists;

-- Projects
DROP POLICY IF EXISTS "Org members can view projects" ON projects;
DROP POLICY IF EXISTS "Org owners can manage projects" ON projects;
DROP POLICY IF EXISTS "Org members can manage projects" ON projects;

-- Project Playlists
DROP POLICY IF EXISTS "Org members can view project playlists" ON project_playlists;
DROP POLICY IF EXISTS "Org owners can manage project playlists" ON project_playlists;
DROP POLICY IF EXISTS "Org members can manage project playlists" ON project_playlists;

-- Project Assignees
DROP POLICY IF EXISTS "Org members can view project assignees" ON project_assignees;
DROP POLICY IF EXISTS "Org owners can manage project assignees" ON project_assignees;
DROP POLICY IF EXISTS "Org members can manage project assignees" ON project_assignees;

-- Project Titles
DROP POLICY IF EXISTS "Org members can view project titles" ON project_titles;
DROP POLICY IF EXISTS "Org owners can manage project titles" ON project_titles;
DROP POLICY IF EXISTS "Org members can manage project titles" ON project_titles;

-- Project Thumbnails
DROP POLICY IF EXISTS "Org members can view project thumbnails" ON project_thumbnails;
DROP POLICY IF EXISTS "Org owners can manage project thumbnails" ON project_thumbnails;
DROP POLICY IF EXISTS "Org members can manage project thumbnails" ON project_thumbnails;

-- Project Tags
DROP POLICY IF EXISTS "Org members can view project tags" ON project_tags;
DROP POLICY IF EXISTS "Org owners can manage project tags" ON project_tags;
DROP POLICY IF EXISTS "Org members can manage project tags" ON project_tags;

-- Scripts
DROP POLICY IF EXISTS "Org members can view scripts" ON scripts;
DROP POLICY IF EXISTS "Org owners can manage scripts" ON scripts;
DROP POLICY IF EXISTS "Org members can manage scripts" ON scripts;

-- Scenes
DROP POLICY IF EXISTS "Org members can view scenes" ON scenes;
DROP POLICY IF EXISTS "Org owners can manage scenes" ON scenes;
DROP POLICY IF EXISTS "Org members can manage scenes" ON scenes;

-- Assets
DROP POLICY IF EXISTS "Org members can view assets" ON assets;
DROP POLICY IF EXISTS "Org owners can manage assets" ON assets;
DROP POLICY IF EXISTS "Org members can manage assets" ON assets;

-- Subscriptions
DROP POLICY IF EXISTS "Org members can view subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Org owners can manage subscriptions" ON subscriptions;

-- Wiki Folders
DROP POLICY IF EXISTS "Org members can view wiki folders" ON wiki_folders;
DROP POLICY IF EXISTS "Org owners can manage wiki folders" ON wiki_folders;
DROP POLICY IF EXISTS "Org members can manage wiki folders" ON wiki_folders;

-- Wiki Documents
DROP POLICY IF EXISTS "Org members can view wiki documents" ON wiki_documents;
DROP POLICY IF EXISTS "Org owners can manage wiki documents" ON wiki_documents;
DROP POLICY IF EXISTS "Org members can manage wiki documents" ON wiki_documents;

-- Packaging Sets
DROP POLICY IF EXISTS "Org members can view packaging sets" ON packaging_sets;
DROP POLICY IF EXISTS "Org members can manage packaging sets" ON packaging_sets;

-- Board Statuses
DROP POLICY IF EXISTS "Org members can view board statuses" ON board_statuses;
DROP POLICY IF EXISTS "Org owners can manage board statuses" ON board_statuses;
DROP POLICY IF EXISTS "Org members can manage board statuses" ON board_statuses;

-- Status Default Tasks
DROP POLICY IF EXISTS "Org members can view default tasks" ON status_default_tasks;
DROP POLICY IF EXISTS "Org owners can manage default tasks" ON status_default_tasks;
DROP POLICY IF EXISTS "Org members can manage default tasks" ON status_default_tasks;

-- Project Tasks
DROP POLICY IF EXISTS "Org members can view project tasks" ON project_tasks;
DROP POLICY IF EXISTS "Org members can manage project tasks" ON project_tasks;

-- Project Status Details
DROP POLICY IF EXISTS "Org members can view project status details" ON project_status_details;
DROP POLICY IF EXISTS "Org members can manage project status details" ON project_status_details;

-- YouTube Connections
DROP POLICY IF EXISTS "Org members can view youtube connections" ON youtube_connections;
DROP POLICY IF EXISTS "Org owners can manage youtube connections" ON youtube_connections;
DROP POLICY IF EXISTS "Org members can manage youtube connections" ON youtube_connections;

-- Billing Events
DROP POLICY IF EXISTS "Admins can view all billing events" ON billing_events;
DROP POLICY IF EXISTS "Org owners can view their billing events" ON billing_events;

-- Plan Keys
DROP POLICY IF EXISTS "Admins can manage plan keys" ON plan_keys;
DROP POLICY IF EXISTS "Users can view their redeemed keys" ON plan_keys;

-- Help Categories
DROP POLICY IF EXISTS "Anyone can view help categories" ON help_categories;
DROP POLICY IF EXISTS "Admins can manage categories" ON help_categories;

-- Help Threads
DROP POLICY IF EXISTS "Anyone can view help threads" ON help_threads;
DROP POLICY IF EXISTS "Authenticated users can create threads" ON help_threads;
DROP POLICY IF EXISTS "Users can update own threads" ON help_threads;
DROP POLICY IF EXISTS "Admins can manage threads" ON help_threads;

-- Help Thread Replies
DROP POLICY IF EXISTS "Anyone can view help replies" ON help_thread_replies;
DROP POLICY IF EXISTS "Authenticated users can create replies" ON help_thread_replies;
DROP POLICY IF EXISTS "Users can update own replies" ON help_thread_replies;
DROP POLICY IF EXISTS "Admins can manage replies" ON help_thread_replies;

-- Support Tickets
DROP POLICY IF EXISTS "Users can view own tickets" ON support_tickets;
DROP POLICY IF EXISTS "Users can create tickets" ON support_tickets;
DROP POLICY IF EXISTS "Admins can view all tickets" ON support_tickets;
DROP POLICY IF EXISTS "Admins can update tickets" ON support_tickets;

-- Support Ticket Messages
DROP POLICY IF EXISTS "Users can view messages for own tickets" ON support_ticket_messages;
DROP POLICY IF EXISTS "Users can add messages to own tickets" ON support_ticket_messages;
DROP POLICY IF EXISTS "Admins can view all ticket messages" ON support_ticket_messages;
DROP POLICY IF EXISTS "Admins can add messages to any ticket" ON support_ticket_messages;

-- Whiteboard
DROP POLICY IF EXISTS "Org members can view whiteboard elements" ON project_whiteboard_elements;
DROP POLICY IF EXISTS "Org members can manage whiteboard elements" ON project_whiteboard_elements;
DROP POLICY IF EXISTS "Org members can view whiteboard connections" ON project_whiteboard_connections;
DROP POLICY IF EXISTS "Org members can manage whiteboard connections" ON project_whiteboard_connections;

-- =============================================================================
-- STEP 2: ENABLE RLS ON ALL TABLES
-- =============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_brandings ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_titles ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_thumbnails ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE wiki_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE wiki_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE packaging_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_default_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_status_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE youtube_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE help_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE help_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE help_thread_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_whiteboard_elements ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_whiteboard_connections ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- STEP 3: CREATE ALL POLICIES
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
-- CHANNELS POLICIES
-- =============================================================================
CREATE POLICY "Org members can view channels" ON channels
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids()));

CREATE POLICY "Org members can manage channels" ON channels
  FOR ALL TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids()))
  WITH CHECK (organization_id IN (SELECT get_user_org_ids()));

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
-- CHANNEL LINKS POLICIES
-- =============================================================================
CREATE POLICY "Org members can view channel links" ON channel_links
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM channels c WHERE c.id = channel_id AND c.organization_id IN (SELECT get_user_org_ids()))
  );

CREATE POLICY "Org members can manage channel links" ON channel_links
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
-- PACKAGING SETS POLICIES
-- =============================================================================
CREATE POLICY "Org members can view packaging sets" ON packaging_sets
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.organization_id IN (SELECT get_user_org_ids()))
  );

CREATE POLICY "Org members can manage packaging sets" ON packaging_sets
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.organization_id IN (SELECT get_user_org_ids()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.organization_id IN (SELECT get_user_org_ids()))
  );

-- =============================================================================
-- BOARD STATUSES POLICIES
-- =============================================================================
CREATE POLICY "Org members can view board statuses" ON board_statuses
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids()));

CREATE POLICY "Org members can manage board statuses" ON board_statuses
  FOR ALL TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids()))
  WITH CHECK (organization_id IN (SELECT get_user_org_ids()));

-- =============================================================================
-- STATUS DEFAULT TASKS POLICIES
-- =============================================================================
CREATE POLICY "Org members can view default tasks" ON status_default_tasks
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM board_statuses bs WHERE bs.id = status_id AND bs.organization_id IN (SELECT get_user_org_ids()))
  );

CREATE POLICY "Org members can manage default tasks" ON status_default_tasks
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM board_statuses bs WHERE bs.id = status_id AND bs.organization_id IN (SELECT get_user_org_ids()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM board_statuses bs WHERE bs.id = status_id AND bs.organization_id IN (SELECT get_user_org_ids()))
  );

-- =============================================================================
-- PROJECT TASKS POLICIES
-- =============================================================================
CREATE POLICY "Org members can view project tasks" ON project_tasks
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.organization_id IN (SELECT get_user_org_ids()))
  );

CREATE POLICY "Org members can manage project tasks" ON project_tasks
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.organization_id IN (SELECT get_user_org_ids()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.organization_id IN (SELECT get_user_org_ids()))
  );

-- =============================================================================
-- PROJECT STATUS DETAILS POLICIES
-- =============================================================================
CREATE POLICY "Org members can view project status details" ON project_status_details
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.organization_id IN (SELECT get_user_org_ids()))
  );

CREATE POLICY "Org members can manage project status details" ON project_status_details
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.organization_id IN (SELECT get_user_org_ids()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.organization_id IN (SELECT get_user_org_ids()))
  );

-- =============================================================================
-- YOUTUBE CONNECTIONS POLICIES
-- =============================================================================
CREATE POLICY "Org members can view youtube connections" ON youtube_connections
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids()));

CREATE POLICY "Org members can manage youtube connections" ON youtube_connections
  FOR ALL TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids()))
  WITH CHECK (organization_id IN (SELECT get_user_org_ids()));

-- =============================================================================
-- BILLING EVENTS POLICIES
-- =============================================================================
CREATE POLICY "Admins can view all billing events" ON billing_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Org owners can view their billing events" ON billing_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM organizations o WHERE o.id = organization_id AND o.owner_id = auth.uid())
  );

-- =============================================================================
-- PLAN KEYS POLICIES
-- =============================================================================
CREATE POLICY "Admins can manage plan keys" ON plan_keys
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Users can view their redeemed keys" ON plan_keys
  FOR SELECT TO authenticated
  USING (redeemed_by = auth.uid());

-- =============================================================================
-- HELP CATEGORIES POLICIES
-- =============================================================================
CREATE POLICY "Anyone can view help categories" ON help_categories
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage categories" ON help_categories
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- =============================================================================
-- HELP THREADS POLICIES
-- =============================================================================
CREATE POLICY "Anyone can view help threads" ON help_threads
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create threads" ON help_threads
  FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "Users can update own threads" ON help_threads
  FOR UPDATE TO authenticated
  USING (author_id = auth.uid());

CREATE POLICY "Admins can manage threads" ON help_threads
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- =============================================================================
-- HELP THREAD REPLIES POLICIES
-- =============================================================================
CREATE POLICY "Anyone can view help replies" ON help_thread_replies
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create replies" ON help_thread_replies
  FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "Users can update own replies" ON help_thread_replies
  FOR UPDATE TO authenticated
  USING (author_id = auth.uid());

CREATE POLICY "Admins can manage replies" ON help_thread_replies
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- =============================================================================
-- SUPPORT TICKETS POLICIES
-- =============================================================================
CREATE POLICY "Users can view own tickets" ON support_tickets
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create tickets" ON support_tickets
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all tickets" ON support_tickets
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Admins can update tickets" ON support_tickets
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- =============================================================================
-- SUPPORT TICKET MESSAGES POLICIES
-- =============================================================================
CREATE POLICY "Users can view messages for own tickets" ON support_ticket_messages
  FOR SELECT TO authenticated
  USING (
    ticket_id IN (SELECT id FROM support_tickets WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can add messages to own tickets" ON support_ticket_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    ticket_id IN (SELECT id FROM support_tickets WHERE user_id = auth.uid())
    AND is_admin = false
  );

CREATE POLICY "Admins can view all ticket messages" ON support_ticket_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Admins can add messages to any ticket" ON support_ticket_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- =============================================================================
-- WHITEBOARD POLICIES
-- =============================================================================
CREATE POLICY "Org members can view whiteboard elements" ON project_whiteboard_elements
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.organization_id IN (SELECT get_user_org_ids()))
  );

CREATE POLICY "Org members can manage whiteboard elements" ON project_whiteboard_elements
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.organization_id IN (SELECT get_user_org_ids()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.organization_id IN (SELECT get_user_org_ids()))
  );

CREATE POLICY "Org members can view whiteboard connections" ON project_whiteboard_connections
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_whiteboard_elements e 
      JOIN projects p ON p.id = e.project_id 
      WHERE e.id = source_element_id AND p.organization_id IN (SELECT get_user_org_ids())
    )
  );

CREATE POLICY "Org members can manage whiteboard connections" ON project_whiteboard_connections
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_whiteboard_elements e 
      JOIN projects p ON p.id = e.project_id 
      WHERE e.id = source_element_id AND p.organization_id IN (SELECT get_user_org_ids())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_whiteboard_elements e 
      JOIN projects p ON p.id = e.project_id 
      WHERE e.id = source_element_id AND p.organization_id IN (SELECT get_user_org_ids())
    )
  );

-- =============================================================================
-- DONE! All RLS policies recreated for exactly 34 tables.
-- =============================================================================
