# How to Manage Default Tasks

## Accessing the Default Tasks Editor

1. **Navigate to your Board**
   - Go to `/studio/[your-studio]/board`

2. **Enter Edit Mode**
   - Click the "Edit Board" button in the top right corner
   - The board switches to edit mode

3. **Expand a Status'\''s Default Tasks**
   - Look for the chevron icon (>) next to each status name
   - Click it to expand and see the default tasks for that status
   - Click again to collapse

4. **Add a New Default Task**
   - In the expanded section, find the input field at the bottom
   - Type your task name
   - Press Enter or click the + button
   - The task is added to the default tasks list

5. **Delete a Default Task**
   - Hover over any default task in the list
   - Click the X icon on the right side
   - The task is removed from the defaults

6. **Exit Edit Mode**
   - Click "Done Editing" or similar button
   - Your changes are saved automatically

## What Happens When You Change Default Tasks

- **Existing Projects**: NOT affected (they keep their current tasks)
- **New Projects**: Will get the updated default tasks
- **Moved Projects**: Will get new tasks when moved to that status

## Example Workflow

```
User: "I want to add '\''Get legal clearance'\'' to the Review status"

1. Go to board  Click "Edit Board"
2. Find "Review" status  Click the > icon
3. See current default tasks:
   - Watch the video in its entirety
   - Confirm there'\''s no mistakes and it'\''s ready for publishing
4. Type "Get legal clearance" in the input field
5. Press Enter
6. New task appears in the list:
   - Watch the video in its entirety
   - Confirm there'\''s no mistakes and it'\''s ready for publishing
   - Get legal clearance
7. Exit edit mode

Result: All future projects in Review status will have 3 tasks instead of 2
```

## Tips

- Default tasks are **per organization** - each studio can customize their own
- Keep tasks clear and actionable
- Order matters - tasks appear in the order you see them
- You can delete ALL default tasks for a status if you want none
- These are templates - users can still add/remove tasks on individual projects
