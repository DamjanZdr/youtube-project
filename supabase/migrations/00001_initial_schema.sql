-- =============================================================================
-- INITIAL SCHEMA - YouTuber Studio
-- Run this single file to set up the entire database from scratch
-- =============================================================================
-- Last updated: 2026-01-04
-- =============================================================================

-- =============================================================================
-- EXTENSIONS
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- ENUMS
-- =============================================================================

-- User roles for organization members
CREATE TYPE user_role AS ENUM ('owner', 'admin', 'editor', 'viewer');

-- Project workflow status (Kanban columns)
CREATE TYPE project_status AS ENUM ('idea', 'script', 'recording', 'editing', 'scheduled', 'published');

-- Video type (long-form vs YouTube Shorts)
CREATE TYPE video_type AS ENUM ('long', 'short');

-- Asset file types
CREATE TYPE asset_type AS ENUM ('thumbnail', 'export', 'short', 'raw', 'audio', 'graphic', 'other');

-- Subscription plan tiers
CREATE TYPE subscription_plan AS ENUM ('free', 'creator', 'studio', 'enterprise');

-- Subscription status
CREATE TYPE subscription_status AS ENUM ('active', 'canceled', 'past_due', 'trialing');

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- PROFILES
-- =============================================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_profiles_email ON profiles(email);

CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- ORGANIZATIONS (Studios)
-- =============================================================================
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_organizations_owner ON organizations(owner_id);
CREATE INDEX idx_organizations_slug ON organizations(slug);

CREATE TRIGGER update_organizations_updated_at 
  BEFORE UPDATE ON organizations 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- ORGANIZATION MEMBERS
-- =============================================================================
CREATE TABLE organization_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'viewer',
  invited_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  UNIQUE(organization_id, user_id)
);

CREATE INDEX idx_org_members_org ON organization_members(organization_id);
CREATE INDEX idx_org_members_user ON organization_members(user_id);

-- =============================================================================
-- CHANNELS
-- =============================================================================
CREATE TABLE channels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  handle TEXT,
  youtube_channel_id TEXT,
  description TEXT,
  avatar_url TEXT,
  banner_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_channels_org ON channels(organization_id);
CREATE INDEX idx_channels_youtube_id ON channels(youtube_channel_id) WHERE youtube_channel_id IS NOT NULL;

CREATE TRIGGER update_channels_updated_at 
  BEFORE UPDATE ON channels 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- CHANNEL BRANDINGS
-- =============================================================================
CREATE TABLE channel_brandings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE UNIQUE,
  logo_url TEXT,
  banner_url TEXT,
  watermark_url TEXT,
  primary_color TEXT,
  secondary_color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_channel_brandings_channel ON channel_brandings(channel_id);

CREATE TRIGGER update_channel_brandings_updated_at 
  BEFORE UPDATE ON channel_brandings 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- CHANNEL LINKS
-- =============================================================================
CREATE TABLE channel_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  url TEXT NOT NULL,
  label TEXT,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_channel_links_channel ON channel_links(channel_id);

CREATE TRIGGER update_channel_links_updated_at 
  BEFORE UPDATE ON channel_links 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- PLAYLISTS
-- =============================================================================
CREATE TABLE playlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  youtube_playlist_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_playlists_org ON playlists(organization_id);
CREATE INDEX idx_playlists_channel ON playlists(channel_id);

CREATE TRIGGER update_playlists_updated_at 
  BEFORE UPDATE ON playlists 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- PROJECTS
-- =============================================================================
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status project_status NOT NULL DEFAULT 'idea',
  video_type video_type NOT NULL DEFAULT 'long',
  due_date TIMESTAMPTZ,
  thumbnail_url TEXT,
  youtube_video_id TEXT,
  scheduled_for TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_projects_org ON projects(organization_id);
CREATE INDEX idx_projects_channel ON projects(channel_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_org_status ON projects(organization_id, status, position);

CREATE TRIGGER update_projects_updated_at 
  BEFORE UPDATE ON projects 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- PROJECT PLAYLISTS (Many-to-Many)
-- =============================================================================
CREATE TABLE project_playlists (
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  playlist_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  position INTEGER DEFAULT 0,
  
  PRIMARY KEY (project_id, playlist_id)
);

CREATE INDEX idx_project_playlists_project ON project_playlists(project_id);
CREATE INDEX idx_project_playlists_playlist ON project_playlists(playlist_id);

-- =============================================================================
-- PROJECT ASSIGNEES
-- =============================================================================
CREATE TABLE project_assignees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  assigned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  UNIQUE(project_id, user_id)
);

CREATE INDEX idx_project_assignees_project ON project_assignees(project_id);
CREATE INDEX idx_project_assignees_user ON project_assignees(user_id);

-- =============================================================================
-- PROJECT TITLES (Multiple options for A/B testing)
-- =============================================================================
CREATE TABLE project_titles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  is_selected BOOLEAN DEFAULT false,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_project_titles_project ON project_titles(project_id);
CREATE INDEX idx_project_titles_project_position ON project_titles(project_id, position);

CREATE TRIGGER update_project_titles_updated_at 
  BEFORE UPDATE ON project_titles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- PROJECT THUMBNAILS (Multiple options for A/B testing)
-- =============================================================================
CREATE TABLE project_thumbnails (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  asset_id UUID,
  url TEXT,
  is_selected BOOLEAN DEFAULT false,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_project_thumbnails_project ON project_thumbnails(project_id);
CREATE INDEX idx_project_thumbnails_project_position ON project_thumbnails(project_id, position);

CREATE TRIGGER update_project_thumbnails_updated_at 
  BEFORE UPDATE ON project_thumbnails 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- PROJECT TAGS
-- =============================================================================
CREATE TABLE project_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_project_tags_project ON project_tags(project_id);
CREATE INDEX idx_project_tags_project_position ON project_tags(project_id, position);
CREATE UNIQUE INDEX idx_project_tags_unique ON project_tags(project_id, lower(tag));

-- =============================================================================
-- SCRIPTS
-- =============================================================================
CREATE TABLE scripts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE UNIQUE,
  title TEXT NOT NULL DEFAULT 'Untitled Script',
  content TEXT,
  word_count INTEGER DEFAULT 0,
  estimated_duration INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_scripts_project ON scripts(project_id);

CREATE TRIGGER update_scripts_updated_at 
  BEFORE UPDATE ON scripts 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- SCENES (Storyboard rows: script + visuals)
-- =============================================================================
CREATE TABLE scenes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  script_id UUID NOT NULL REFERENCES scripts(id) ON DELETE CASCADE,
  script_text TEXT DEFAULT '',
  visual_notes TEXT DEFAULT '',
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_scenes_script ON scenes(script_id);
CREATE INDEX idx_scenes_script_position ON scenes(script_id, position);

CREATE TRIGGER update_scenes_updated_at 
  BEFORE UPDATE ON scenes 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- ASSETS
-- =============================================================================
CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  type asset_type NOT NULL DEFAULT 'other',
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER DEFAULT 0,
  mime_type TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_assets_org ON assets(organization_id);
CREATE INDEX idx_assets_project ON assets(project_id);
CREATE INDEX idx_assets_type ON assets(type);

CREATE TRIGGER update_assets_updated_at 
  BEFORE UPDATE ON assets 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Add foreign key for project_thumbnails -> assets (after assets table exists)
ALTER TABLE project_thumbnails 
  ADD CONSTRAINT fk_project_thumbnails_asset 
  FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE SET NULL;

-- =============================================================================
-- SUBSCRIPTIONS
-- =============================================================================
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,
  stripe_customer_id TEXT NOT NULL,
  stripe_subscription_id TEXT NOT NULL UNIQUE,
  plan subscription_plan NOT NULL DEFAULT 'free',
  status subscription_status NOT NULL DEFAULT 'active',
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_subscriptions_org ON subscriptions(organization_id);
CREATE INDEX idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
CREATE INDEX idx_subscriptions_stripe_sub ON subscriptions(stripe_subscription_id);

CREATE TRIGGER update_subscriptions_updated_at 
  BEFORE UPDATE ON subscriptions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- WIKI FOLDERS
-- =============================================================================
CREATE TABLE wiki_folders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  parent_folder_id UUID REFERENCES wiki_folders(id) ON DELETE CASCADE,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_wiki_folders_org ON wiki_folders(organization_id);
CREATE INDEX idx_wiki_folders_parent ON wiki_folders(parent_folder_id);
CREATE INDEX idx_wiki_folders_org_position ON wiki_folders(organization_id, position);

CREATE TRIGGER update_wiki_folders_updated_at 
  BEFORE UPDATE ON wiki_folders 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- WIKI DOCUMENTS
-- =============================================================================
CREATE TABLE wiki_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  folder_id UUID REFERENCES wiki_folders(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT DEFAULT '',
  position INTEGER DEFAULT 0,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_wiki_documents_folder ON wiki_documents(folder_id);
CREATE INDEX idx_wiki_documents_org ON wiki_documents(organization_id);
CREATE INDEX idx_wiki_documents_folder_position ON wiki_documents(folder_id, position);

CREATE TRIGGER update_wiki_documents_updated_at 
  BEFORE UPDATE ON wiki_documents 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

-- Enable RLS on all tables
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

-- =============================================================================
-- HELPER FUNCTION: Check org membership (avoids recursion)
-- =============================================================================
CREATE OR REPLACE FUNCTION is_org_member(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organization_members 
    WHERE organization_id = org_id AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_org_owner(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organizations 
    WHERE id = org_id AND owner_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

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
-- PROFILES POLICIES
-- =============================================================================
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- =============================================================================
-- ORGANIZATIONS POLICIES
-- =============================================================================
CREATE POLICY "Owners can view their organizations" ON organizations
  FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "Members can view organizations" ON organizations
  FOR SELECT USING (is_org_member(id));

CREATE POLICY "Users can create organizations" ON organizations
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can update organizations" ON organizations
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Owners can delete organizations" ON organizations
  FOR DELETE USING (owner_id = auth.uid());

-- =============================================================================
-- ORGANIZATION MEMBERS POLICIES (NO SELF-REFERENCE)
-- =============================================================================
CREATE POLICY "Users can view their own memberships" ON organization_members
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Owners can view all org members" ON organization_members
  FOR SELECT USING (is_org_owner(organization_id));

CREATE POLICY "Owners can add members" ON organization_members
  FOR INSERT WITH CHECK (is_org_owner(organization_id));

CREATE POLICY "Owners can update members" ON organization_members
  FOR UPDATE USING (is_org_owner(organization_id));

CREATE POLICY "Owners can remove members" ON organization_members
  FOR DELETE USING (is_org_owner(organization_id));

CREATE POLICY "Users can leave orgs" ON organization_members
  FOR DELETE USING (user_id = auth.uid());

-- =============================================================================
-- CHANNELS POLICIES
-- =============================================================================
CREATE POLICY "Org members can view channels" ON channels
  FOR SELECT USING (organization_id IN (SELECT get_user_org_ids()));

CREATE POLICY "Org owners can manage channels" ON channels
  FOR ALL USING (is_org_owner(organization_id));

-- =============================================================================
-- CHANNEL BRANDINGS POLICIES
-- =============================================================================
CREATE POLICY "Org members can view channel brandings" ON channel_brandings
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM channels c WHERE c.id = channel_id AND c.organization_id IN (SELECT get_user_org_ids()))
  );

CREATE POLICY "Org owners can manage channel brandings" ON channel_brandings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM channels c WHERE c.id = channel_id AND is_org_owner(c.organization_id))
  );

-- =============================================================================
-- CHANNEL LINKS POLICIES
-- =============================================================================
CREATE POLICY "Org members can view channel links" ON channel_links
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM channels c WHERE c.id = channel_id AND c.organization_id IN (SELECT get_user_org_ids()))
  );

CREATE POLICY "Org owners can manage channel links" ON channel_links
  FOR ALL USING (
    EXISTS (SELECT 1 FROM channels c WHERE c.id = channel_id AND is_org_owner(c.organization_id))
  );

-- =============================================================================
-- PLAYLISTS POLICIES
-- =============================================================================
CREATE POLICY "Org members can view playlists" ON playlists
  FOR SELECT USING (organization_id IN (SELECT get_user_org_ids()));

CREATE POLICY "Org owners can manage playlists" ON playlists
  FOR ALL USING (is_org_owner(organization_id));

-- =============================================================================
-- PROJECTS POLICIES
-- =============================================================================
CREATE POLICY "Org members can view projects" ON projects
  FOR SELECT USING (organization_id IN (SELECT get_user_org_ids()));

CREATE POLICY "Org owners can manage projects" ON projects
  FOR ALL USING (is_org_owner(organization_id));

-- =============================================================================
-- PROJECT PLAYLISTS POLICIES
-- =============================================================================
CREATE POLICY "Org members can view project playlists" ON project_playlists
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.organization_id IN (SELECT get_user_org_ids()))
  );

CREATE POLICY "Org owners can manage project playlists" ON project_playlists
  FOR ALL USING (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND is_org_owner(p.organization_id))
  );

-- =============================================================================
-- PROJECT ASSIGNEES POLICIES
-- =============================================================================
CREATE POLICY "Org members can view project assignees" ON project_assignees
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.organization_id IN (SELECT get_user_org_ids()))
  );

CREATE POLICY "Org owners can manage project assignees" ON project_assignees
  FOR ALL USING (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND is_org_owner(p.organization_id))
  );

-- =============================================================================
-- PROJECT TITLES POLICIES
-- =============================================================================
CREATE POLICY "Org members can view project titles" ON project_titles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.organization_id IN (SELECT get_user_org_ids()))
  );

CREATE POLICY "Org owners can manage project titles" ON project_titles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND is_org_owner(p.organization_id))
  );

-- =============================================================================
-- PROJECT THUMBNAILS POLICIES
-- =============================================================================
CREATE POLICY "Org members can view project thumbnails" ON project_thumbnails
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.organization_id IN (SELECT get_user_org_ids()))
  );

CREATE POLICY "Org owners can manage project thumbnails" ON project_thumbnails
  FOR ALL USING (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND is_org_owner(p.organization_id))
  );

-- =============================================================================
-- PROJECT TAGS POLICIES
-- =============================================================================
CREATE POLICY "Org members can view project tags" ON project_tags
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.organization_id IN (SELECT get_user_org_ids()))
  );

CREATE POLICY "Org owners can manage project tags" ON project_tags
  FOR ALL USING (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND is_org_owner(p.organization_id))
  );

-- =============================================================================
-- SCRIPTS POLICIES
-- =============================================================================
CREATE POLICY "Org members can view scripts" ON scripts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.organization_id IN (SELECT get_user_org_ids()))
  );

CREATE POLICY "Org owners can manage scripts" ON scripts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND is_org_owner(p.organization_id))
  );

-- =============================================================================
-- SCENES POLICIES
-- =============================================================================
CREATE POLICY "Org members can view scenes" ON scenes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM scripts s 
      JOIN projects p ON p.id = s.project_id 
      WHERE s.id = script_id AND p.organization_id IN (SELECT get_user_org_ids())
    )
  );

CREATE POLICY "Org owners can manage scenes" ON scenes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM scripts s 
      JOIN projects p ON p.id = s.project_id 
      WHERE s.id = script_id AND is_org_owner(p.organization_id)
    )
  );

-- =============================================================================
-- ASSETS POLICIES
-- =============================================================================
CREATE POLICY "Org members can view assets" ON assets
  FOR SELECT USING (organization_id IN (SELECT get_user_org_ids()));

CREATE POLICY "Org owners can manage assets" ON assets
  FOR ALL USING (is_org_owner(organization_id));

-- =============================================================================
-- SUBSCRIPTIONS POLICIES
-- =============================================================================
CREATE POLICY "Org members can view subscriptions" ON subscriptions
  FOR SELECT USING (organization_id IN (SELECT get_user_org_ids()));

CREATE POLICY "Org owners can manage subscriptions" ON subscriptions
  FOR ALL USING (is_org_owner(organization_id));

-- =============================================================================
-- WIKI FOLDERS POLICIES
-- =============================================================================
CREATE POLICY "Org members can view wiki folders" ON wiki_folders
  FOR SELECT USING (organization_id IN (SELECT get_user_org_ids()));

CREATE POLICY "Org owners can manage wiki folders" ON wiki_folders
  FOR ALL USING (is_org_owner(organization_id));

-- =============================================================================
-- WIKI DOCUMENTS POLICIES
-- =============================================================================
CREATE POLICY "Org members can view wiki documents" ON wiki_documents
  FOR SELECT USING (organization_id IN (SELECT get_user_org_ids()));

CREATE POLICY "Org owners can manage wiki documents" ON wiki_documents
  FOR ALL USING (is_org_owner(organization_id));

-- =============================================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- =============================================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists (for re-running)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger for new user signups
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =============================================================================
-- DONE!
-- =============================================================================
