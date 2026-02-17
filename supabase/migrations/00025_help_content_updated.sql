-- =============================================================================
-- HELP CENTER CONTENT: Updated Typography (H2 titles, H5 section headers)
-- Run this in your Supabase SQL Editor
-- This will DELETE existing articles and insert updated versions
-- =============================================================================

-- Delete all existing threads first
DELETE FROM help_thread_replies;
DELETE FROM help_threads;

-- Update category positions and descriptions
UPDATE help_categories SET position = 1, description = 'New to Blueprint? Start here with the basics!' WHERE slug = 'getting-started';
UPDATE help_categories SET position = 10, description = 'Chat with the community about anything Blueprint-related' WHERE slug = 'general';

-- Delete old categories we're replacing (if they exist)
DELETE FROM help_categories WHERE slug IN ('projects', 'packaging', 'channel', 'team', 'billing', 'youtube', 'feature-requests');

-- Insert reorganized categories (if not exists)
INSERT INTO help_categories (name, slug, description, icon, position)
SELECT 'Hub & Studios', 'hub-studios', 'Creating and managing your studios', 'building-2', 2
WHERE NOT EXISTS (SELECT 1 FROM help_categories WHERE slug = 'hub-studios');

INSERT INTO help_categories (name, slug, description, icon, position)
SELECT 'Projects', 'projects', 'Creating and organizing video projects', 'folder-kanban', 3
WHERE NOT EXISTS (SELECT 1 FROM help_categories WHERE slug = 'projects');

INSERT INTO help_categories (name, slug, description, icon, position)
SELECT 'Board & Tasks', 'board-tasks', 'Using the kanban board and task management', 'layout', 4
WHERE NOT EXISTS (SELECT 1 FROM help_categories WHERE slug = 'board-tasks');

INSERT INTO help_categories (name, slug, description, icon, position)
SELECT 'Wiki & Documentation', 'wiki', 'Creating documentation and guides for your team', 'book-open', 5
WHERE NOT EXISTS (SELECT 1 FROM help_categories WHERE slug = 'wiki');

INSERT INTO help_categories (name, slug, description, icon, position)
SELECT 'Channel & Branding', 'channel-branding', 'Channel preview and branding design', 'tv', 6
WHERE NOT EXISTS (SELECT 1 FROM help_categories WHERE slug = 'channel-branding');

INSERT INTO help_categories (name, slug, description, icon, position)
SELECT 'Packaging & Thumbnails', 'packaging', 'Designing thumbnails and video packaging', 'image', 7
WHERE NOT EXISTS (SELECT 1 FROM help_categories WHERE slug = 'packaging');

INSERT INTO help_categories (name, slug, description, icon, position)
SELECT 'Team & Collaboration', 'team', 'Inviting members and managing permissions', 'users', 8
WHERE NOT EXISTS (SELECT 1 FROM help_categories WHERE slug = 'team');

INSERT INTO help_categories (name, slug, description, icon, position)
SELECT 'Billing & Subscriptions', 'billing', 'Plans, payments, and account management', 'credit-card', 9
WHERE NOT EXISTS (SELECT 1 FROM help_categories WHERE slug = 'billing');

-- =============================================================================
-- ARTICLES: Getting Started
-- =============================================================================

INSERT INTO help_threads (category_id, title, slug, content, is_pinned, is_official) VALUES
(
  (SELECT id FROM help_categories WHERE slug = 'getting-started'),
  'Welcome to Blueprint - Your YouTube Production Hub',
  'welcome-to-blueprint',
  '## Welcome to Blueprint

Blueprint is your all-in-one production hub for YouTube content creation. Whether you are a solo creator or managing a team, Blueprint helps you plan, organize, and produce better videos.

##### What Can You Do With Blueprint?

**Organize Your Projects**
- Create projects for each video idea
- Track them from concept to publication
- Use the visual kanban board to see your pipeline

**Design Your Packaging**
- Create thumbnails and titles before filming
- Preview how they will look on YouTube
- Test multiple variations

**Preview Your Channel**
- See exactly how your channel page will appear
- Test banners at different device sizes
- Preview video grids with new content

**Manage Tasks**
- Break down video production into tasks
- Assign work to team members
- Track progress and deadlines

**Document Everything**
- Build a wiki for your team
- Store scripts, guidelines, and resources
- Keep knowledge organized and searchable

**Collaborate With Your Team**
- Invite editors, designers, and collaborators
- Set permissions for each role
- Keep everyone on the same page

##### Getting Started

1. Create your first Studio - A studio is your workspace for a YouTube channel
2. Add a Project - Create your first video project
3. Design your Packaging - Add a thumbnail and title
4. Invite your Team - Bring in collaborators (optional)

Ready to dive in? Check out the other guides in this category.',
  true,
  true
),
(
  (SELECT id FROM help_categories WHERE slug = 'getting-started'),
  'Creating Your First Studio',
  'creating-first-studio',
  '## Creating Your First Studio

A Studio in Blueprint represents a YouTube channel workspace. All your projects, branding, and team members are organized within a studio.

##### Step 1: Go to the Hub

After signing in, you will land on the Hub - your home base showing all your studios.

##### Step 2: Click Create Studio

Click the Create Studio button to open the creation dialog.

##### Step 3: Enter Studio Details

- Studio Name - Choose a name (usually your channel name)
- Studio Slug - This creates your unique URL

##### Step 4: Start Creating

Once your studio is created, you will be taken to the studio home page where you can:

- Create your first project
- Set up your channel branding
- Invite team members

##### Tips

- You can create multiple studios if you manage multiple channels
- Studio owners can transfer ownership to another member
- Free accounts can create 1 studio with up to 3 projects

Need help with something specific? [Contact Support](/help/tickets/new)',
  false,
  true
),
(
  (SELECT id FROM help_categories WHERE slug = 'getting-started'),
  'Understanding the Studio Layout',
  'studio-layout-overview',
  '## Understanding the Studio Layout

Once you are inside a studio, you will see the main navigation on the left sidebar. Here is what each section does:

##### Home
Your studio dashboard showing recent activity, quick stats, and shortcuts to common actions.

##### Channel
Preview your YouTube channel page. See how your banner, profile picture, and video grid will look to viewers.

##### Projects
View all your video projects in a list or grid. Filter by status, search, and create new projects.

##### Board
A kanban-style board showing all projects across different stages:
- Idea
- Script
- Recording
- Editing
- Scheduled
- Published

##### Wiki
Your team documentation hub. Create folders and documents for scripts, guidelines, and resources.

##### Settings
Manage studio settings, members, integrations, and options like deleting the studio.

##### Switching Studios

Click your profile picture at the bottom of the sidebar, then select Back to Hub to switch between studios.',
  false,
  true
);

-- =============================================================================
-- ARTICLES: Hub & Studios
-- =============================================================================

INSERT INTO help_threads (category_id, title, slug, content, is_pinned, is_official) VALUES
(
  (SELECT id FROM help_categories WHERE slug = 'hub-studios'),
  'Managing Multiple Studios',
  'managing-multiple-studios',
  '## Managing Multiple Studios

If you run multiple YouTube channels, you can create a separate studio for each one.

##### Creating Additional Studios

1. Click your profile at the bottom of any studio sidebar
2. Select Back to Hub
3. Click Create Studio

##### Switching Between Studios

From the Hub, simply click on any studio card to enter it.

##### Studio Limits by Plan

| Plan | Studios | Projects per Studio |
|------|---------|-------------------|
| Free | 1 | 3 |
| Creator | 3 | 25 |
| Pro | 10 | Unlimited |
| Team | Unlimited | Unlimited |

##### Leaving a Studio

If you were invited to someone else''s studio and want to leave:

1. Go to Settings in that studio
2. Scroll to the bottom
3. Click Leave Studio

Note: Studio owners cannot leave. They must transfer ownership first or delete the studio.',
  false,
  true
),
(
  (SELECT id FROM help_categories WHERE slug = 'hub-studios'),
  'Transferring Studio Ownership',
  'transferring-ownership',
  '## Transferring Studio Ownership

Need to hand off your studio to someone else? Here is how to transfer ownership.

##### Requirements

- You must be the current studio owner
- The new owner must already be a member of the studio
- The new owner must have an active subscription (or the studio must fit within free tier limits)

##### How to Transfer

1. Go to your studio Settings
2. Navigate to the Members section
3. Find the member you want to transfer to
4. Click the menu next to their name
5. Select Transfer Ownership
6. Confirm the transfer

##### What Happens After Transfer

- The new owner gets full control of the studio
- You become an Admin member
- All projects, wiki content, and settings remain intact
- The new owner''s subscription limits now apply

##### Can I Get Ownership Back?

Only if the new owner transfers it back to you. Choose carefully.',
  false,
  true
);

-- =============================================================================
-- ARTICLES: Projects
-- =============================================================================

INSERT INTO help_threads (category_id, title, slug, content, is_pinned, is_official) VALUES
(
  (SELECT id FROM help_categories WHERE slug = 'projects'),
  'Creating and Managing Projects',
  'creating-managing-projects',
  '## Creating and Managing Projects

Projects are the heart of Blueprint. Each project represents a video from idea to publication.

##### Creating a Project

1. Go to Projects in the sidebar
2. Click New Project
3. Enter a working title
4. Click Create

##### Project Statuses

Projects move through these stages:

- Idea - Initial concept, brainstorming
- Script - Writing and finalizing the script
- Recording - Filming or recording content
- Editing - Post-production work
- Scheduled - Ready and scheduled for upload
- Published - Live on YouTube

##### Changing Status

You can change a project''s status in several ways:

1. From the Project page - Click the status badge and select a new status
2. From the Board - Drag the project card to a different column
3. From the Projects list - Click the status dropdown

##### Project Tabs

Each project has several tabs:

- Idea - Your video concept and research
- Storyboard - Scene-by-scene breakdown
- Packaging - Thumbnail and title design
- Tasks - Production checklist
- Settings - Project settings',
  true,
  true
),
(
  (SELECT id FROM help_categories WHERE slug = 'projects'),
  'Using the Storyboard Feature',
  'using-storyboard',
  '## Using the Storyboard Feature

The storyboard helps you plan your video scene by scene before recording.

##### What is a Storyboard?

A storyboard breaks your video into individual scenes or segments. Each scene has:

- Title - A short name for the scene
- Description - What happens in this scene
- Duration - Estimated length in seconds
- Notes - Additional details, shot ideas, etc.

##### Creating Scenes

1. Open a project and go to the Storyboard tab
2. Click Add Scene
3. Fill in the scene details
4. Drag scenes to reorder them

##### Scene Duration

As you add durations to scenes, Blueprint calculates your total video length. This helps you:

- Plan videos to hit target lengths (e.g., 10 minutes for mid-roll ads)
- Identify scenes that might be too long
- Estimate recording and editing time

##### Tips for Better Storyboards

- Keep scene descriptions concise but clear
- Include B-roll and transition notes
- Add estimated durations even if rough
- Reorder scenes to find the best flow before recording',
  false,
  true
);

-- =============================================================================
-- ARTICLES: Board & Tasks
-- =============================================================================

INSERT INTO help_threads (category_id, title, slug, content, is_pinned, is_official) VALUES
(
  (SELECT id FROM help_categories WHERE slug = 'board-tasks'),
  'Using the Kanban Board',
  'using-kanban-board',
  '## Using the Kanban Board

The Board gives you a visual overview of all projects across different production stages.

##### Board Columns

The board has columns for each project status:

| Column | Meaning |
|--------|---------|
| Idea | New concepts being developed |
| Script | Script in progress |
| Recording | Currently filming |
| Editing | In post-production |
| Scheduled | Ready, waiting to publish |
| Published | Live on YouTube |

##### Moving Projects

Drag and drop any project card to move it between columns. This automatically updates the project status.

##### Project Cards

Each card shows:

- Project title
- Thumbnail preview (if set)
- Task progress (e.g., 3/5 tasks done)
- Assignees
- Due date (if set)

##### Filtering the Board

Use the filter options to:

- Show only your assigned projects
- Filter by team member
- Search by project name

##### Board vs List View

- Board - Best for seeing overall pipeline and moving projects between stages
- Projects List - Best for searching, sorting, and detailed filtering',
  true,
  true
),
(
  (SELECT id FROM help_categories WHERE slug = 'board-tasks'),
  'Managing Tasks Within Projects',
  'managing-tasks',
  '## Managing Tasks Within Projects

Tasks help you break down video production into actionable steps.

##### Default Tasks

When you create a project, Blueprint automatically adds common tasks:

- Write script outline
- Record footage
- Edit video
- Create thumbnail
- Write title and description
- Upload to YouTube

You can customize these defaults in studio settings.

##### Adding Custom Tasks

1. Open a project
2. Go to the Tasks tab
3. Click Add Task
4. Enter the task description
5. Optionally assign it and set a due date

##### Completing Tasks

Click the checkbox next to any task to mark it complete. Your progress shows on the project card in the board view.

##### Task Assignment

Assign tasks to specific team members:

1. Click on a task
2. Click the assignee dropdown
3. Select a team member

Assigned members will see their tasks highlighted and can filter by their assignments.

##### Task Due Dates

Set due dates to keep production on track. Overdue tasks are highlighted in red.',
  false,
  true
);

-- =============================================================================
-- ARTICLES: Wiki & Documentation
-- =============================================================================

INSERT INTO help_threads (category_id, title, slug, content, is_pinned, is_official) VALUES
(
  (SELECT id FROM help_categories WHERE slug = 'wiki'),
  'Building Your Team Wiki',
  'building-team-wiki',
  '## Building Your Team Wiki

The Wiki is your team''s knowledge base. Store scripts, guidelines, templates, and any documentation your team needs.

##### Why Use the Wiki?

- Centralized Knowledge - Everything in one place
- Team Onboarding - Help new members get up to speed
- Consistency - Document your processes and standards
- Scripts and Outlines - Store video scripts alongside projects

##### Creating Documents

1. Go to Wiki in the sidebar
2. Click New Document
3. Give it a title
4. Start writing

##### Organizing with Folders

Create folders to organize your documents:

1. Click New Folder
2. Name your folder
3. Drag documents into folders

Suggested Folder Structure:

- Scripts
- Brand Guidelines
- Templates
- Training
- Resources

##### Rich Text Editor

The wiki editor supports:

- Headings, bold, italic
- Bullet and numbered lists
- Code blocks
- Links and images
- Embeds',
  true,
  true
),
(
  (SELECT id FROM help_categories WHERE slug = 'wiki'),
  'Wiki Tips and Best Practices',
  'wiki-tips',
  '## Wiki Tips and Best Practices

Make the most of your team wiki with these tips.

##### Document Naming

Use clear, searchable names:

- Good: "Thumbnail Design Guidelines"
- Bad: "Guidelines v2 FINAL"

##### Templates

Create template documents that team members can copy:

- Video script template
- Project brief template
- Collaboration agreement template

##### Keep It Updated

- Review documents quarterly
- Archive outdated content in an Archive folder
- Add Last Updated dates to critical docs

##### Font Preferences

Customize your reading experience:

- Click the font selector in the wiki
- Choose between serif, sans-serif, and monospace
- Your preference is saved automatically

##### Search

Use the search bar at the top of the wiki to quickly find any document.',
  false,
  true
);

-- =============================================================================
-- ARTICLES: Channel & Branding
-- =============================================================================

INSERT INTO help_threads (category_id, title, slug, content, is_pinned, is_official) VALUES
(
  (SELECT id FROM help_categories WHERE slug = 'channel-branding'),
  'Using the Channel Preview',
  'channel-preview',
  '## Using the Channel Preview

The Channel page lets you preview exactly how your YouTube channel will look before making any changes live.

##### What You Can Preview

- Banner - Your channel art at different device sizes
- Profile Picture - How your avatar appears
- Video Grid - How your published videos display
- Channel Name and Handle - Your display name and @handle

##### Safe Zones

YouTube displays banners differently on different devices:

- Mobile - Only the center portion is visible
- Tablet - More of the banner shows
- Desktop/TV - Full banner is visible

Blueprint shows you these safe zones so you can design banners that look great everywhere.

##### Preview Modes

Toggle between device previews:

- Mobile view
- Desktop view
- TV view

##### Making Changes

The channel preview is view-only. It shows what your channel looks like based on your actual YouTube data.

To connect your YouTube channel and sync data, go to Settings then YouTube Integration.',
  true,
  true
),
(
  (SELECT id FROM help_categories WHERE slug = 'channel-branding'),
  'Channel Branding Best Practices',
  'branding-best-practices',
  '## Channel Branding Best Practices

Create a cohesive, professional look for your YouTube channel.

##### Banner Guidelines

Recommended size: 2560 x 1440 pixels

Safe area for text/logos: Center 1546 x 423 pixels (visible on all devices)

Tips:

- Keep important content in the center
- Use high contrast for text legibility
- Include your upload schedule if you have one
- Update seasonally or for special events

##### Profile Picture

Recommended size: 800 x 800 pixels

Tips:

- Use a clear, recognizable image
- Works well as a small circle
- Consistent with your brand colors
- High resolution for all devices

##### Consistency Across Videos

Create a recognizable brand by keeping these consistent:

- Thumbnail style - Similar layout, fonts, colors
- Title format - Consistent capitalization and structure
- Color palette - 2-3 main colors
- Typography - 1-2 fonts maximum',
  false,
  true
);

-- =============================================================================
-- ARTICLES: Packaging & Thumbnails
-- =============================================================================

INSERT INTO help_threads (category_id, title, slug, content, is_pinned, is_official) VALUES
(
  (SELECT id FROM help_categories WHERE slug = 'packaging'),
  'Designing Effective Thumbnails',
  'designing-thumbnails',
  '## Designing Effective Thumbnails

Your thumbnail is the first thing viewers see. Make it count.

##### Using the Packaging Tab

1. Open a project
2. Go to the Packaging tab
3. Upload your thumbnail image
4. Add your video title
5. Preview how it looks

##### Thumbnail Best Practices

Size and Format:

- Dimensions: 1280 x 720 pixels (16:9 ratio)
- File size: Under 2MB
- Format: JPG, PNG, or GIF

Design Tips:

Do:

- Use high contrast colors
- Include faces showing emotion
- Add 2-3 words of text maximum
- Use bold, readable fonts
- Create curiosity or interest

Do not:

- Use small text that is hard to read
- Clutter with too many elements
- Use misleading images (clickbait hurts long-term)
- Copy other creators'' exact style

##### Title and Thumbnail Combo

Your title and thumbnail should work together:

- Do not repeat the same text in both
- Thumbnail creates curiosity, title provides context
- Together they should tell viewers exactly what to expect

##### A/B Testing

Consider creating 2-3 thumbnail variations and testing which performs better using YouTube''s built-in thumbnail test feature.',
  true,
  true
),
(
  (SELECT id FROM help_categories WHERE slug = 'packaging'),
  'Using Packaging Sets',
  'packaging-sets',
  '## Using Packaging Sets

Packaging Sets help you save and reuse thumbnail/title combinations for A/B testing or iterations.

##### What is a Packaging Set?

A packaging set stores:

- Thumbnail image
- Video title
- Optional description snippet

You can create multiple sets per project to compare options.

##### Creating a Packaging Set

1. Go to your project''s Packaging tab
2. Upload a thumbnail and enter a title
3. Click Save as Set
4. Name your set (e.g., "Option A - Red Background")

##### Comparing Sets

View all your saved sets side by side to compare:

- Which thumbnail is more eye-catching?
- Which title creates more curiosity?
- How do they look in the channel preview?

##### Setting Active Packaging

Choose which set is active. This is what displays on your channel preview and board cards.

##### Tips

- Create sets for different concepts before deciding
- Get team feedback on which option works best
- Save winning formulas as inspiration for future videos',
  false,
  true
);

-- =============================================================================
-- ARTICLES: Team & Collaboration
-- =============================================================================

INSERT INTO help_threads (category_id, title, slug, content, is_pinned, is_official) VALUES
(
  (SELECT id FROM help_categories WHERE slug = 'team'),
  'Inviting Team Members',
  'inviting-team-members',
  '## Inviting Team Members

Collaborate with editors, designers, managers, and other team members.

##### Sending an Invite

1. Go to your studio Settings
2. Click the Members tab
3. Click Invite Member
4. Enter their email address
5. Select their role
6. Click Send Invite

##### Member Roles

| Role | Permissions |
|------|------------|
| Viewer | Can view projects and wiki, cannot edit |
| Member | Can create and edit projects, tasks, wiki |
| Admin | All member permissions plus manage members |
| Owner | Full control including delete studio |

##### Invite Status

Invites can have these statuses:

- Pending - Sent but not yet accepted
- Accepted - Member has joined
- Expired - Invite was not accepted in time (7 days)

##### Accepting an Invite

If someone invites you:

1. Check your email for the invite
2. Click the link in the email
3. Sign in or create an account
4. You will be added to the studio automatically

##### Invite Limits by Plan

| Plan | Team Members |
|------|-------------|
| Free | 2 |
| Creator | 5 |
| Pro | 15 |
| Team | Unlimited |',
  true,
  true
),
(
  (SELECT id FROM help_categories WHERE slug = 'team'),
  'Managing Member Permissions',
  'member-permissions',
  '## Managing Member Permissions

Control what each team member can do in your studio.

##### Changing Roles

1. Go to Settings then Members
2. Find the member
3. Click the role dropdown
4. Select a new role

##### Role Details

Viewer:

- View projects, board, wiki
- Cannot create or edit anything
- Great for clients or stakeholders

Member:

- Create and edit projects
- Create and complete tasks
- Add and edit wiki documents
- Upload assets

Admin:

- Everything Members can do
- Invite and remove members
- Change member roles (except Owner)
- Edit studio settings

Owner:

- Everything Admins can do
- Delete the studio
- Transfer ownership
- Manage billing

##### Removing Members

1. Go to Settings then Members
2. Click the menu next to the member
3. Select Remove from Studio
4. Confirm removal

Removed members lose access immediately but their contributions (tasks, wiki edits) remain.',
  false,
  true
);

-- =============================================================================
-- ARTICLES: Billing & Subscriptions
-- =============================================================================

INSERT INTO help_threads (category_id, title, slug, content, is_pinned, is_official) VALUES
(
  (SELECT id FROM help_categories WHERE slug = 'billing'),
  'Understanding Plans and Pricing',
  'plans-and-pricing',
  '## Understanding Plans and Pricing

Blueprint offers several plans to fit your needs.

##### Free Plan

Perfect for trying Blueprint:

- 1 Studio
- 3 Projects
- 2 Team Members
- Basic features

##### Creator Plan

For individual creators:

- 3 Studios
- 25 Projects per studio
- 5 Team Members
- All features
- Priority support

##### Pro Plan

For serious creators and small teams:

- 10 Studios
- Unlimited Projects
- 15 Team Members
- All features
- Priority support

##### Team Plan

For agencies and large teams:

- Unlimited Studios
- Unlimited Projects
- Unlimited Team Members
- All features
- Priority support
- Dedicated account manager

##### Billing Cycle

- Monthly - Pay month-to-month, cancel anytime
- Annual - Save 20% with yearly billing

##### Changing Plans

Go to Account Settings then Subscription to upgrade, downgrade, or manage your plan.',
  true,
  true
),
(
  (SELECT id FROM help_categories WHERE slug = 'billing'),
  'Managing Your Subscription',
  'managing-subscription',
  '## Managing Your Subscription

Everything you need to know about billing and subscription management.

##### Viewing Your Plan

Go to Account Settings (click your profile then Account Settings) to see:

- Current plan
- Billing cycle
- Next payment date
- Usage statistics

##### Upgrading

1. Go to Account Settings then Subscription
2. Click Upgrade
3. Select your new plan
4. Enter payment details
5. Enjoy your new features immediately

##### Downgrading

1. Go to Account Settings then Subscription
2. Click Change Plan
3. Select a lower tier
4. Changes take effect at the end of your billing period

Note: If you are over the new plan''s limits, you will need to reduce studios, projects, or members first.

##### Canceling

1. Go to Account Settings then Subscription
2. Click Cancel Subscription
3. Your access continues until the end of your billing period
4. Data is retained for 30 days after expiration

##### Payment Methods

We accept:

- Credit/debit cards (Visa, Mastercard, Amex)
- Some regions support additional methods

##### Invoices

Download invoices from Account Settings then Billing History.',
  false,
  true
),
(
  (SELECT id FROM help_categories WHERE slug = 'billing'),
  'Redeeming a License Key',
  'redeeming-license-key',
  '## Redeeming a License Key

Got a license key? Here is how to redeem it.

##### What is a License Key?

License keys are promotional or pre-purchased codes that unlock Blueprint subscriptions. You might receive one from:

- AppSumo or other deal sites
- Giveaways and promotions
- Team purchases

##### How to Redeem

1. Go to [myblueprint.studio/redeem](/redeem)
2. Enter your license key
3. Click Redeem
4. Your account is instantly upgraded

##### Key Format

Keys look like: XXXX-XXXX-XXXX-XXXX

##### Already Have a Subscription?

If you are already subscribed and redeem a key:

- Your current subscription is canceled
- The key''s plan takes effect immediately
- No double-charging

##### Key Not Working?

Common issues:

- Check for typos (copy-paste recommended)
- Key may have already been used
- Key may have expired

Still having trouble? [Contact Support](/help/tickets/new) with your key and we will help.',
  false,
  true
);

-- =============================================================================
-- ARTICLES: General Discussion
-- =============================================================================

INSERT INTO help_threads (category_id, title, slug, content, is_pinned, is_official) VALUES
(
  (SELECT id FROM help_categories WHERE slug = 'general'),
  'Welcome to General Discussion',
  'welcome-general-discussion',
  '## Welcome to General Discussion

This is the place to chat about anything Blueprint-related that does not fit in other categories.

##### What to Post Here

- Introduce yourself and your channel
- Share tips and tricks you have discovered
- Ask general questions
- Connect with other creators
- Discuss YouTube strategy

##### Community Guidelines

- Be respectful and constructive
- No self-promotion or spam
- Keep discussions relevant to Blueprint and YouTube
- Help others when you can

##### Need Official Help?

For bugs, billing issues, or account problems, please [submit a support ticket](/help/tickets/new) instead. Our team will respond faster than the community forum.

Happy creating.',
  true,
  true
);

-- =============================================================================
-- Done. All articles updated with H2 titles and H5 section headers.
-- =============================================================================
