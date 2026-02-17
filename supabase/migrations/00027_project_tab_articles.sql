-- =============================================================================
-- HELP CENTER: Project Tab Articles
-- Detailed articles for each project tab: Idea, Packaging, Preview, Storyboard, Tasks
-- Plus the main Projects page article
-- Run this in your Supabase SQL Editor
-- =============================================================================

-- Delete old generic project articles to replace with detailed ones
DELETE FROM help_threads WHERE slug IN (
  'creating-managing-projects',
  'using-storyboard',
  'projects-page',
  'project-idea-tab',
  'project-packaging-tab',
  'project-preview-tab',
  'project-storyboard-tab',
  'project-tasks-tab'
);

-- =============================================================================
-- ARTICLE: The Projects Page
-- =============================================================================

INSERT INTO help_threads (category_id, title, slug, content, is_pinned, is_official) VALUES
(
  (SELECT id FROM help_categories WHERE slug = 'projects'),
  'The Projects Page - Managing Your Content',
  'projects-page',
  '## The Projects Page - Managing Your Content
The Projects page is your content command center where you create, organize, and track all your video projects.

##### **The Content Pipeline**
At the top of the page, you''ll see your content pipeline - a visual overview of where all your projects stand:

- **Idea** - Projects in the brainstorming phase
- **Package** - Working on titles and thumbnails
- **Script** - Writing and planning content
- **Record** - Filming in progress
- **Edit** - Post-production work
- **Review** - Final checks before publishing
- **Complete** - Published videos

Each status shows a count so you can see your workload at a glance.

##### **Creating a New Project**
To start a new video project:

1. Click the **+ New Project** button in the top right
2. Enter a working title for your video
3. Select the video type (Long or Short)
4. Click Create

Your project starts in the Idea stage, ready for brainstorming.

##### **Filtering Projects**
Find projects quickly using the filter options:

- **Search** - Type to search by project name
- **All** - Show all projects
- **Long** - Show only long-form videos
- **Short** - Show only YouTube Shorts

##### **View Modes**
Switch between two ways to view your projects:

- **Grid View** - Visual cards with thumbnails (default)
- **List View** - Compact rows for scanning many projects

Click the icons in the top right to switch views.

##### **Project Cards**
Each project card shows:

- **Thumbnail** - Your selected thumbnail (or placeholder)
- **Video Type** - Badge showing Long or Short
- **Title** - Your project name
- **Status** - Current stage in the pipeline

Click any card to open that project.

##### **Working with Projects**
From the Projects page, you can:

- **Open a project** - Click the card to enter the project editor
- **See progress** - Check the pipeline counts
- **Filter by type** - Focus on Longs or Shorts
- **Create new** - Start fresh projects anytime

##### *Tips for Project Management*
- Use the pipeline view to identify bottlenecks
- Keep project titles descriptive but concise
- Archive completed projects to keep the page clean
- Review your pipeline weekly to stay on track',
  true,
  true
);

-- =============================================================================
-- ARTICLE: The Idea Tab (Whiteboard)
-- =============================================================================

INSERT INTO help_threads (category_id, title, slug, content, is_pinned, is_official) VALUES
(
  (SELECT id FROM help_categories WHERE slug = 'projects'),
  'The Idea Tab - Visual Brainstorming',
  'project-idea-tab',
  '## The Idea Tab - Visual Brainstorming
The Idea tab is an infinite canvas whiteboard where you can visually brainstorm and map out your video concepts.

##### **What is the Idea Tab?**
Think of it as a digital whiteboard. You can create panels with notes, connect ideas with flow lines, and draw freely. It''s perfect for:

- Mind mapping video topics
- Planning video structure
- Organizing research notes
- Creating visual outlines

##### **Creating Panels**
Panels are the building blocks of your idea board.

1. Click the **+ Panel** button in the toolbar
2. Click anywhere on the canvas to place it
3. Click the panel to select it, then click again to edit
4. Type your notes or ideas

##### **Customizing Panels**
Select a panel to see customization options:

- **Background Color** - Change the panel color to categorize ideas
- **Border Color** - Add visual emphasis
- **Text Color** - Ensure readability
- **Title** - Add a header to your panel

##### **Connecting Ideas**
Draw lines between panels to show relationships:

1. Select a panel
2. Hold **Shift** and click another panel
3. A connection line appears between them
4. Lines animate with a flowing effect to show direction

##### **Adding Text**
For standalone text without a panel:

1. Click the **T** (Text) button
2. Click on the canvas
3. Type your text
4. Use this for labels, headers, or annotations

##### **Free Drawing**
Need to sketch something quickly?

1. Click the **Draw** tool (pencil icon)
2. Draw directly on the canvas
3. Change colors using the color picker
4. Click **Select** tool to return to normal mode

##### **Navigation**
Working on a large board? Use these controls:

- **Zoom In/Out** - Use the +/- buttons or scroll wheel
- **Pan** - Hold spacebar and drag, or middle-click drag
- **Fit to Screen** - Click the maximize button

##### *Tips for Better Brainstorming*
- Use different panel colors for different categories (topics, questions, examples)
- Keep panel text concise - expand details in other tabs
- Connect related ideas to see the flow of your video
- Use the drawing tool to circle or highlight important clusters
- Export your board as a reference while scripting',
  false,
  true
);

-- =============================================================================
-- ARTICLE: The Packaging Tab
-- =============================================================================

INSERT INTO help_threads (category_id, title, slug, content, is_pinned, is_official) VALUES
(
  (SELECT id FROM help_categories WHERE slug = 'projects'),
  'The Packaging Tab - Titles and Thumbnails',
  'project-packaging-tab',
  '## The Packaging Tab - Titles and Thumbnails
The Packaging tab is where you prepare everything viewers see before clicking: your title, thumbnail, description, and tags.

##### **Why Multiple Titles and Thumbnails?**
YouTube success often comes down to packaging. By creating multiple options, you can:

- Compare different approaches side by side
- A/B test what resonates with your audience
- Have backups ready if something doesn''t perform
- Get feedback from team members before publishing

##### **Managing Titles**
You can create up to 5 title variations:

1. Click **Add Title**
2. Type your title idea
3. Click the radio button to select it as your primary
4. The selected title appears in the Preview tab

**Title Tips:**
- Keep titles under 60 characters to avoid truncation
- Front-load important keywords
- Create curiosity without being clickbait
- Test different emotional angles

##### **Managing Thumbnails**
Upload up to 5 thumbnail options:

1. Click **Upload Thumbnail** or drag and drop an image
2. Click the radio button to select your primary thumbnail
3. Use the Preview tab to see how it looks in a feed

**Thumbnail Tips:**
- Use 1280x720 pixels (16:9 ratio)
- Keep text large and readable on mobile
- Use contrasting colors to stand out
- Show emotion and faces when relevant
- Avoid clutter - simple often wins

##### **Writing Descriptions**
Your description helps with search and provides context:

- First 2-3 lines appear in search results - make them count
- Include relevant keywords naturally
- Add timestamps for longer videos
- Include links to related content
- Add your social media and subscribe reminder

##### **Adding Tags**
Tags help YouTube understand your content:

1. Type a tag and press Enter
2. Add 5-15 relevant tags
3. Mix broad and specific terms
4. Include common misspellings of key terms

##### **Selecting a Playlist**
Organize your content by assigning videos to playlists:

1. Click the playlist dropdown
2. Select an existing playlist
3. Or create a new one from your channel settings

##### **Video Type**
Mark your video as Long-form or Short:

- **Long-form** - Regular videos over 60 seconds
- **Short** - Vertical videos under 60 seconds',
  false,
  true
);

-- =============================================================================
-- ARTICLE: The Preview Tab
-- =============================================================================

INSERT INTO help_threads (category_id, title, slug, content, is_pinned, is_official) VALUES
(
  (SELECT id FROM help_categories WHERE slug = 'projects'),
  'The Preview Tab - See How Your Video Looks',
  'project-preview-tab',
  '## The Preview Tab - See How Your Video Looks
The Preview tab shows you exactly how your video will appear alongside other content on YouTube before you publish.

##### **Why Preview Matters**
Your video doesn''t exist in isolation. It competes for attention in:

- Home feeds
- Search results
- Suggested videos
- Subscription feeds

The Preview tab simulates these environments so you can see if your packaging stands out.

##### **Using the Preview**
The preview shows your video alongside grey placeholder boxes representing other videos:

1. Your video appears with the selected title and thumbnail from the Packaging tab
2. Grey boxes simulate competing videos
3. Look at your video objectively - does it grab attention?

##### **Switching Between Options**
Compare different title and thumbnail combinations:

1. Use the **Title** dropdown to switch between your title options
2. Use the **Thumbnail** dropdown to switch between your thumbnail options
3. See each combination instantly without leaving the page

##### **View Modes**
Test how your video looks on different devices:

- **Landscape** - Desktop home feed layout (4 columns)
- **Portrait** - Mobile feed layout (1-2 columns)

Your thumbnail needs to work in both contexts. Text that''s readable on desktop might be too small on mobile.

##### **What to Look For**
When reviewing your preview, ask yourself:

1. **Does it stand out?** - Would you click on it among the grey boxes?
2. **Is the thumbnail clear?** - Can you understand it at a glance?
3. **Is the title compelling?** - Does it create curiosity?
4. **Is text readable?** - Especially on mobile view?
5. **Does it match your brand?** - Is it recognizable as your content?

##### *Tips for Getting Feedback*
- Share your screen with team members
- Quickly flip through title/thumbnail combos
- Get votes on which option is strongest
- Make decisions based on visual comparison, not just text',
  false,
  true
);

-- =============================================================================
-- ARTICLE: The Storyboard Tab
-- =============================================================================

INSERT INTO help_threads (category_id, title, slug, content, is_pinned, is_official) VALUES
(
  (SELECT id FROM help_categories WHERE slug = 'projects'),
  'The Storyboard Tab - Script Your Video',
  'project-storyboard-tab',
  '## The Storyboard Tab - Script Your Video
The Storyboard tab is a two-column script editor that helps you plan both what you''ll say and what viewers will see.

##### **Two-Column Layout**
Each scene has two sides:

- **Left Column (Script)** - Your dialogue, narration, and spoken words
- **Right Column (Visuals)** - Camera shots, B-roll, graphics, and sound effects

This separation helps you think about your video as both audio AND visual content.

##### **Creating Scenes**
Build your video scene by scene:

1. Click **Add Scene** at the bottom
2. Write your script on the left
3. Add visual notes on the right
4. Scenes are numbered automatically

##### **Writing Scripts**
In the left column, write what you''ll say:

- Keep language conversational
- Write how you speak, not how you write
- Include pauses and transitions
- Mark emphasis with caps or bold

##### **Planning Visuals**
In the right column, note what viewers will see:

- Camera angles (wide shot, close-up, face cam)
- B-roll footage needed
- On-screen graphics or text
- Sound effects or music cues
- Transitions between shots

##### **Reordering Scenes**
Drag scenes to rearrange your structure:

1. Hover over the scene number
2. Drag up or down
3. Release to drop in the new position

##### **Duration Tracking**
The header shows your estimated video length:

- **Word Count** - Total words in all scenes
- **Est. Duration** - Calculated from word count and speaking pace

This helps you hit target lengths (like 8-10 minutes for mid-roll ads).

##### *Tips for Better Storyboards*
- **Start with an outline** - List your main points before writing full scripts
- **Hook early** - Your first scene should grab attention
- **Think visually** - Don''t just plan a podcast with a camera
- **Be specific** - "Show product demo" is better than "B-roll"
- **Include CTAs** - Plan where you''ll ask for likes, comments, subscribes
- **Review the flow** - Read through the entire script before recording

##### **Using Storyboards During Production**
Your storyboard becomes your production guide:

- **Recording** - Follow the script, check off scenes as you film
- **Editing** - Use visual notes to find and place B-roll
- **Review** - Compare final video against your plan',
  false,
  true
);

-- =============================================================================
-- ARTICLE: The Tasks Tab
-- =============================================================================

INSERT INTO help_threads (category_id, title, slug, content, is_pinned, is_official) VALUES
(
  (SELECT id FROM help_categories WHERE slug = 'projects'),
  'The Tasks Tab - Production Checklist',
  'project-tasks-tab',
  '## The Tasks Tab - Production Checklist
The Tasks tab provides a checklist for each production stage, helping you track what needs to be done at every phase of your video.

##### **How Tasks Are Organized**
Tasks are grouped by your project''s board statuses:

- **Idea** - Research and concept tasks
- **Script** - Writing and review tasks
- **Recording** - Filming and capture tasks
- **Editing** - Post-production tasks
- **Scheduled** - Pre-publish tasks
- **Published** - Post-publish tasks

Each group only shows when you''re in that stage or have tasks for it.

##### **Default Tasks**
When you create a new project, Blueprint automatically creates common tasks for each stage. For example:

**Idea Stage:**
- Research topic
- Outline main points
- Check competitor videos

**Recording Stage:**
- Set up equipment
- Film main content
- Capture B-roll

These are starting points - customize them for your workflow.

##### **Working with Tasks**
**Completing Tasks**
- Click the checkbox to mark a task complete
- Completed tasks show with a strikethrough

**Adding Tasks**
1. Find the status section you want
2. Click the text field at the bottom
3. Type your task and press Enter

**Deleting Tasks**
- Click the X button next to any task
- Default tasks can be deleted too

##### **Task Status Assignments**
For team collaboration, you can assign people to work on specific stages:

1. Click the assignee dropdown in any status section
2. Select a team member
3. They''ll see this assignment in their view

##### **Due Dates by Stage**
Set deadlines for each production stage:

1. Click the date picker in a status section
2. Select a due date
3. This helps track if you''re on schedule for each phase

##### *Tips for Task Management*
- **Customize defaults** - Add tasks specific to your content type
- **Be specific** - "Add intro animation" beats "edit video"
- **Check regularly** - Review tasks when changing project status
- **Assign owners** - Clear responsibility prevents things falling through cracks
- **Set realistic dates** - Buffer time prevents rushed content

##### **Syncing with the Board**
Tasks connect to your studio''s board view:

- When you check off all tasks in a stage, consider moving to the next status
- The board shows overall project progress
- Team members can see task completion at a glance',
  false,
  true
);

-- =============================================================================
-- Done. Run this migration to add project tab articles.
-- =============================================================================
