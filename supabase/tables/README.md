# Supabase Tables

Each table has its own folder with numbered SQL files (migrations).

## What's a migration?

A **migration is just SQL**. The word "migration" means "SQL that changes your database." That's it.

- `00001_init.sql` = Creates the table from scratch
- `00002_rls.sql` = Adds Row Level Security policies
- `00003_add_tags.sql` = (future) Adds a tags column

The numbers keep them in order so you know what to run first.

## Folder Structure

```
tables/
├── _enums/
│   └── 00001_init.sql       # Shared enum types (run FIRST)
├── _functions/
│   └── 00001_init.sql       # Shared functions (run SECOND)
├── profiles/
│   ├── 00001_init.sql       # Creates the table
│   └── 00002_rls.sql        # Adds security policies
├── organizations/
│   ├── 00001_init.sql
│   └── 00002_rls.sql
├── ... (other tables)
```

## How to Use

### Fresh Database Setup
Run in this order:
1. `_enums/00001_init.sql`
2. `_functions/00001_init.sql`
3. Each table's `00001_init.sql` (in dependency order below)
4. Each table's `00002_rls.sql`

### Dependency Order (for table creation)

**Core:**
1. profiles
2. organizations
3. organization_members
4. channels
5. channel_brandings
6. channel_links

**Projects & Packaging:**
7. playlists
8. projects
9. project_playlists
10. project_assignees
11. project_titles
12. project_thumbnails
13. project_tags

**Storyboard:**
14. scripts
15. scenes

**Assets & Billing:**
16. assets
17. subscriptions

**Wiki:**
18. wiki_folders
19. wiki_documents

### Making Future Changes

When you need to change a table (e.g., add a column to `projects`):

1. Create `projects/00003_add_priority.sql`:
```sql
-- Add priority column to projects
ALTER TABLE projects ADD COLUMN priority INTEGER DEFAULT 0;
CREATE INDEX idx_projects_priority ON projects(priority);
```

2. Run it in Supabase SQL Editor

3. Done! The file stays there as a record of what you did.

## Yes, these match the original schema!

All the SQL in these folders is the same as what was in `00001_initial_schema.sql` - just split up by table so it's easier to find and update.

