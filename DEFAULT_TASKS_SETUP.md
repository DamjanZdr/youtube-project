# Default Tasks Setup Instructions

## What This Does
This migration populates your kanban board statuses with default tasks based on the standard YouTube content creation workflow shown in your screenshot.

## Default Tasks Being Added:

### Idea
- One sentence description of the project
- Intro hook that will keep the viewer engaged
- Loop that will repeat covering majority of the video
- Call to action target
- Call to action implementation
- Video length and reason for it

### Package
- Make 1-5 thumbnails
- Compare against your history and choose the best one
- Write SEO friendly description
- Add SEO friendly tags
- Select a playlist this video will be a part of

### Script
- Write the entire video script scene by scene
- Write editing visualization for each scene

### Record
- Record the materials you need for the script (video/voiceovers)
- Record/Download the needed materials based on the visualization notes

### Edit
- Follow the visualization to match exactly with the script

### Review
- Watch the video in its entirety
- Confirm there'\''s no mistakes and it'\''s ready for publishing

### Complete
- Make a new upload
- Put the correct packaging data
- Publish/schedule the video

## How to Run:

1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Open the file: `supabase/00012_seed_default_tasks.sql`
4. Copy all the contents
5. Paste into Supabase SQL Editor
6. Click "Run"

## Customizing Default Tasks:

After running this migration, you can customize the default tasks for each status:

1. Go to your board page
2. Click the "Edit Board" button (top right)
3. Click the chevron (>) icon next to any status to expand default tasks
4. Add new tasks using the input field
5. Delete tasks by clicking the X icon
6. Exit edit mode when done

## Important Notes:

- This migration is **idempotent** - you can run it multiple times safely
- It only adds tasks to statuses that match the exact names (Idea, Package, Script, etc.)
- If you have custom status names, you'\''ll need to add tasks manually through the UI
- Users can fully customize these defaults per organization
- **Automatic task copying**: When a project is created or moved to a different status, it automatically gets a copy of that status's default tasks
- Default tasks are copied as regular tasks on the project, so they can be checked off individually
- The trigger ensures all new projects start with the appropriate checklist for their current stage
