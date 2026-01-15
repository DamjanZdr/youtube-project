#  ACTION ITEMS - Default Tasks Setup

##  Completed (By AI)

-  Created migration file `supabase/00012_seed_default_tasks.sql`
-  Added all 21 default tasks from your screenshot
-  Created automatic task copying trigger
-  Created setup documentation
-  Created user guide for managing default tasks
-  Verified existing UI supports all functionality

##  To Do (By You)

### 1. Run the Migration
- [ ] Open Supabase Dashboard
- [ ] Go to SQL Editor
- [ ] Copy contents of `supabase/00012_seed_default_tasks.sql`
- [ ] Paste and click "Run"
- [ ] Verify "Success" message appears

### 2. Verify It Worked
- [ ] Go to your board page (`/studio/[your-studio]/board`)
- [ ] Click "Edit Board" button (top right)
- [ ] Click the > icon next to "Idea" status
- [ ] Confirm you see 6 default tasks listed
- [ ] Check a few other statuses too

### 3. Test Automatic Task Copying (Optional)
- [ ] Move an existing project to a different status
- [ ] Open that project
- [ ] Confirm it has the default tasks from the new status
- [ ] Or wait until you create a new project and test then

##  Files Reference

**Migration to run:**
- `supabase/00012_seed_default_tasks.sql` - Main migration file

**Documentation:**
- `DEFAULT_TASKS_COMPLETE.md` - Overview of what was done
- `DEFAULT_TASKS_SETUP.md` - Setup instructions
- `HOW_TO_MANAGE_DEFAULT_TASKS.md` - User guide for managing tasks

##  Expected Result

After running the migration, you should have:

1. **All 7 statuses** with their default tasks:
   - Idea: 6 tasks
   - Package: 5 tasks  
   - Script: 2 tasks
   - Record: 2 tasks
   - Edit: 1 task
   - Review: 2 tasks
   - Complete: 3 tasks

2. **Automatic copying** - when projects are created or moved, they get default tasks

3. **Full customization** - you can add/remove default tasks anytime in Edit Board mode

##  Important Notes

- Run this migration in your **production** Supabase instance
- The migration is safe to run multiple times (idempotent)
- It only affects organizations that have statuses with matching names
- Users can still customize tasks per project after they'\''re copied

##  Troubleshooting

**If you don'\''t see default tasks after running the migration:**
1. Make sure your statuses are named exactly: "Idea", "Package", "Script", etc.
2. Check the Supabase SQL Editor for any error messages
3. Try expanding a different status in Edit Board mode

**If automatic copying doesn'\''t work:**
1. Check that the trigger was created: `SELECT * FROM pg_trigger WHERE tgname = '\''trigger_copy_default_tasks'\'';`
2. Make sure projects have a `board_status_id` set
3. Check Supabase logs for any error messages

##  Next Steps After This

Once default tasks are set up, you can:
- Customize tasks for your specific workflow
- Add new statuses with their own default tasks
- Train team members on the standard process
- Use the checklist to ensure nothing gets missed

---

**Need help?** Check the documentation files or let me know!
