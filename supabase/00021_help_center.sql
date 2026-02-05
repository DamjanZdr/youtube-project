-- =============================================================================
-- HELP CENTER
-- Forum/Knowledge Base + Support Ticket System
-- =============================================================================

-- =============================================================================
-- PART 1: FORUM / KNOWLEDGE BASE
-- =============================================================================

-- Categories for organizing help articles and discussions
CREATE TABLE help_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  icon VARCHAR(50), -- Lucide icon name
  position INTEGER DEFAULT 0, -- For ordering
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Insert default categories
INSERT INTO help_categories (name, slug, description, icon, position) VALUES
  ('Getting Started', 'getting-started', 'New to Blueprint? Start here!', 'rocket', 1),
  ('Projects & Storyboards', 'projects', 'Learn about creating and managing projects', 'folder', 2),
  ('Packaging & Thumbnails', 'packaging', 'Design your video packaging and thumbnails', 'image', 3),
  ('Channel & Branding', 'channel', 'Manage your channel branding and previews', 'tv', 4),
  ('Team & Collaboration', 'team', 'Working with team members and permissions', 'users', 5),
  ('Billing & Subscriptions', 'billing', 'Plans, payments, and account management', 'credit-card', 6),
  ('YouTube Integration', 'youtube', 'Connecting and syncing with YouTube', 'youtube', 7),
  ('Feature Requests', 'feature-requests', 'Suggest new features and improvements', 'lightbulb', 8),
  ('General Discussion', 'general', 'Anything else related to Blueprint', 'message-circle', 9);

-- Forum threads (articles/discussions)
CREATE TABLE help_threads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID NOT NULL REFERENCES help_categories(id) ON DELETE CASCADE,
  author_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  content TEXT NOT NULL, -- Markdown content, can include YouTube embeds
  
  -- Thread flags
  is_pinned BOOLEAN DEFAULT FALSE, -- Pinned to top of category
  is_official BOOLEAN DEFAULT FALSE, -- Official guide from system/admin
  is_locked BOOLEAN DEFAULT FALSE, -- No more replies allowed
  
  -- Stats
  view_count INTEGER DEFAULT 0,
  reply_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  UNIQUE(category_id, slug)
);

CREATE INDEX idx_help_threads_category ON help_threads(category_id);
CREATE INDEX idx_help_threads_author ON help_threads(author_id);
CREATE INDEX idx_help_threads_pinned ON help_threads(is_pinned) WHERE is_pinned = TRUE;

-- Thread replies
CREATE TABLE help_thread_replies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id UUID NOT NULL REFERENCES help_threads(id) ON DELETE CASCADE,
  author_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  content TEXT NOT NULL, -- Markdown content
  
  -- For admin responses
  is_official BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_help_replies_thread ON help_thread_replies(thread_id);
CREATE INDEX idx_help_replies_author ON help_thread_replies(author_id);

-- =============================================================================
-- PART 2: SUPPORT TICKETS
-- =============================================================================

-- Ticket status enum
CREATE TYPE support_ticket_status AS ENUM (
  'awaiting_response',  -- Waiting for admin to respond
  'responded',          -- Admin has responded, waiting for user
  'resolved',           -- Issue resolved
  'archived'            -- Old/closed tickets
);

-- Ticket category enum
CREATE TYPE support_ticket_category AS ENUM (
  'bug_report',
  'feature_request', 
  'billing_issue',
  'account_help',
  'technical_support',
  'other'
);

-- Support tickets
CREATE TABLE support_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_number SERIAL, -- Human-readable ticket number like #1234
  
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  subject VARCHAR(255) NOT NULL,
  category support_ticket_category NOT NULL DEFAULT 'other',
  status support_ticket_status NOT NULL DEFAULT 'awaiting_response',
  
  -- Optional context
  related_studio_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  related_project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  resolved_at TIMESTAMPTZ
);

CREATE INDEX idx_support_tickets_user ON support_tickets(user_id);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_support_tickets_created ON support_tickets(created_at DESC);

-- Ticket messages (conversation between user and admin)
CREATE TABLE support_ticket_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  
  -- Who sent this message
  sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  is_admin BOOLEAN DEFAULT FALSE, -- True if sent by admin
  
  content TEXT NOT NULL,
  
  -- Optional attachments (screenshots etc)
  attachments JSONB DEFAULT '[]', -- Array of {url, filename, type}
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_ticket_messages_ticket ON support_ticket_messages(ticket_id);
CREATE INDEX idx_ticket_messages_created ON support_ticket_messages(created_at);

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

ALTER TABLE help_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE help_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE help_thread_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_ticket_messages ENABLE ROW LEVEL SECURITY;

-- Help Center: Everyone can read
CREATE POLICY "Anyone can view help categories" ON help_categories
  FOR SELECT USING (TRUE);

CREATE POLICY "Anyone can view help threads" ON help_threads
  FOR SELECT USING (TRUE);

CREATE POLICY "Anyone can view help replies" ON help_thread_replies
  FOR SELECT USING (TRUE);

-- Help Center: Only authenticated users can create threads/replies
CREATE POLICY "Authenticated users can create threads" ON help_threads
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create replies" ON help_thread_replies
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Help Center: Users can edit their own threads/replies
CREATE POLICY "Users can update own threads" ON help_threads
  FOR UPDATE USING (author_id = auth.uid());

CREATE POLICY "Users can update own replies" ON help_thread_replies
  FOR UPDATE USING (author_id = auth.uid());

-- Support Tickets: Users can only see their own tickets
CREATE POLICY "Users can view own tickets" ON support_tickets
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create tickets" ON support_tickets
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view messages for own tickets" ON support_ticket_messages
  FOR SELECT USING (
    ticket_id IN (SELECT id FROM support_tickets WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can add messages to own tickets" ON support_ticket_messages
  FOR INSERT WITH CHECK (
    ticket_id IN (SELECT id FROM support_tickets WHERE user_id = auth.uid())
    AND is_admin = FALSE
  );

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Update reply count on thread
CREATE OR REPLACE FUNCTION update_thread_reply_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE help_threads SET reply_count = reply_count + 1 WHERE id = NEW.thread_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE help_threads SET reply_count = reply_count - 1 WHERE id = OLD.thread_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_thread_reply_count_trigger
  AFTER INSERT OR DELETE ON help_thread_replies
  FOR EACH ROW EXECUTE FUNCTION update_thread_reply_count();

-- Auto-update ticket status when message is added
CREATE OR REPLACE FUNCTION update_ticket_status_on_message()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_admin THEN
    -- Admin replied, set to responded
    UPDATE support_tickets 
    SET status = 'responded', updated_at = NOW() 
    WHERE id = NEW.ticket_id AND status = 'awaiting_response';
  ELSE
    -- User replied, set back to awaiting response
    UPDATE support_tickets 
    SET status = 'awaiting_response', updated_at = NOW() 
    WHERE id = NEW.ticket_id AND status = 'responded';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ticket_status_trigger
  AFTER INSERT ON support_ticket_messages
  FOR EACH ROW EXECUTE FUNCTION update_ticket_status_on_message();

-- Update timestamps
CREATE TRIGGER update_help_threads_updated_at
  BEFORE UPDATE ON help_threads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_help_replies_updated_at
  BEFORE UPDATE ON help_thread_replies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
