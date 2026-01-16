# Free Tier Abuse Prevention

## Overview

This migration implements abuse prevention for the free tier by tracking project initiations and enforcing membership limits.

## Key Features

### 1. **Project Initiation Tracking**
- Added `project_initiations_count` column to `organizations` table
- Counter increments when a project is created
- **Never decrements** when a project is deleted
- This prevents users from creating unlimited projects by deleting and recreating

### 2. **One Free Tier Organization Per User**
- Users can only be a member of **one free tier organization** at a time
- Can join multiple paid organizations without limit
- Enforced via trigger on `organization_members` table

### 3. **Project Creation Limits by Plan**
- **Free**: 1 project creation (lifetime)
- **Creator**: 10 project creations (lifetime)
- **Studio**: Unlimited
- Enforced via trigger on `projects` table

## How It Works

### Project Creation Flow
```
User creates project
  ↓
Check current project_initiations_count
  ↓
If count >= plan limit → ERROR
  ↓
If count < limit → Allow creation
  ↓
Increment project_initiations_count
```

### Free Tier Membership Flow
```
User tries to join/create free org
  ↓
Check how many free orgs they're in
  ↓
If already in 1 free org → ERROR
  ↓
If in 0 free orgs → Allow
```

## Example Scenarios

### Scenario 1: Free User Creates & Deletes
1. User creates organization (free tier)
2. Creates project #1 → `project_initiations_count = 1` ✅
3. Deletes project #1 → `project_initiations_count = 1` (unchanged)
4. Tries to create project #2 → ❌ ERROR: "Limit reached"

### Scenario 2: User Tries Multiple Free Orgs
1. User is member of Free Org A
2. Tries to join Free Org B → ❌ ERROR
3. Upgrades Org A to Creator plan
4. Can now join Free Org B ✅

### Scenario 3: Upgrading Plans
1. Free org has `project_initiations_count = 1`
2. User upgrades to Creator plan
3. Can now create 9 more projects (total lifetime: 10)

## Migration Steps

1. **Run the migration** in Supabase SQL Editor:
   ```bash
   # Copy contents of supabase/00013_free_tier_abuse_prevention.sql
   ```

2. **Backfill existing data**:
   - The migration automatically backfills `project_initiations_count` with current project counts
   - Existing organizations are unaffected

3. **Test the limits**:
   - Try creating multiple projects in a free org
   - Try joining multiple free orgs with the same user

## Database Changes

### New Columns
- `organizations.project_initiations_count` (INTEGER, DEFAULT 0)

### New Functions
- `increment_project_initiations()` - Auto-increments counter on project creation
- `check_free_tier_limit()` - Validates free tier membership limit
- `check_project_creation_limit()` - Validates project creation against plan limits

### New Triggers
- `trigger_increment_project_initiations` - Runs after project INSERT
- `trigger_check_free_tier_limit` - Runs before organization_member INSERT
- `trigger_check_project_creation_limit` - Runs before project INSERT

## Error Messages

Users will see clear error messages:
- `"You can only be a member of one free tier organization. Please upgrade your current organization or leave it first."`
- `"Project creation limit reached for free plan (1 projects). Upgrade to create more projects."`

## Future Enhancements

Consider adding:
- Grace period for upgrades
- Ability to reset counter when upgrading (optional)
- Admin panel to view/reset counters
- Analytics on upgrade conversions from hitting limits
