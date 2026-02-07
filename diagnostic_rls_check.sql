-- =============================================================================
-- RLS DIAGNOSTIC SCRIPT
-- Run this in Supabase SQL Editor to check your RLS status
-- =============================================================================

-- 1. CHECK WHICH TABLES HAVE RLS ENABLED
SELECT 
  schemaname,
  tablename,
  rowsecurity as "RLS Enabled"
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN (
    'channels', 'channel_links', 'channel_brandings',
    'organizations', 'organization_members',
    'profiles', 'subscriptions', 'plan_keys',
    'projects', 'project_tasks', 'project_titles', 'project_thumbnails',
    'board_statuses', 'status_default_tasks',
    'wiki_folders', 'wiki_documents'
  )
ORDER BY tablename;

-- 2. LIST ALL POLICIES ON KEY TABLES
SELECT 
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  LEFT(qual::text, 80) as "USING clause (truncated)",
  LEFT(with_check::text, 80) as "WITH CHECK (truncated)"
FROM pg_policies 
WHERE schemaname = 'public'
  AND tablename IN (
    'channels', 'channel_links', 'channel_brandings',
    'organizations', 'organization_members',
    'profiles', 'subscriptions', 'plan_keys',
    'projects'
  )
ORDER BY tablename, policyname;

-- 3. CHECK SPECIFIC TABLES THAT WERE FAILING

-- Channels policies
SELECT '=== CHANNELS ===' as section;
SELECT policyname, cmd, permissive FROM pg_policies WHERE tablename = 'channels';

-- Channel Links policies
SELECT '=== CHANNEL_LINKS ===' as section;
SELECT policyname, cmd, permissive FROM pg_policies WHERE tablename = 'channel_links';

-- Plan Keys policies
SELECT '=== PLAN_KEYS ===' as section;
SELECT policyname, cmd, permissive FROM pg_policies WHERE tablename = 'plan_keys';

-- Subscriptions policies
SELECT '=== SUBSCRIPTIONS ===' as section;
SELECT policyname, cmd, permissive FROM pg_policies WHERE tablename = 'subscriptions';

-- Profiles policies
SELECT '=== PROFILES ===' as section;
SELECT policyname, cmd, permissive FROM pg_policies WHERE tablename = 'profiles';

-- Organizations policies
SELECT '=== ORGANIZATIONS ===' as section;
SELECT policyname, cmd, permissive FROM pg_policies WHERE tablename = 'organizations';

-- 4. CHECK IF get_user_org_ids() FUNCTION EXISTS
SELECT 
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('get_user_org_ids', 'is_org_owner', 'is_org_member');

-- 5. TEST get_user_org_ids() FOR CURRENT USER
-- This will show which orgs the currently logged-in user has access to
SELECT * FROM get_user_org_ids();

-- 6. CHECK ORGANIZATION_MEMBERS FOR CURRENT USER
SELECT 
  om.organization_id,
  o.name as org_name,
  om.role,
  om.status
FROM organization_members om
JOIN organizations o ON o.id = om.organization_id
WHERE om.user_id = auth.uid();

-- 7. SUMMARY: Tables missing INSERT/UPDATE/DELETE policies
-- (Tables that only have SELECT policies will fail on writes)
WITH policy_coverage AS (
  SELECT 
    tablename,
    bool_or(cmd = 'SELECT') as has_select,
    bool_or(cmd = 'INSERT') as has_insert,
    bool_or(cmd = 'UPDATE') as has_update,
    bool_or(cmd = 'DELETE') as has_delete,
    bool_or(cmd = 'ALL') as has_all
  FROM pg_policies 
  WHERE schemaname = 'public'
  GROUP BY tablename
)
SELECT 
  tablename,
  CASE WHEN has_select OR has_all THEN '✓' ELSE '✗' END as "SELECT",
  CASE WHEN has_insert OR has_all THEN '✓' ELSE '✗' END as "INSERT",
  CASE WHEN has_update OR has_all THEN '✓' ELSE '✗' END as "UPDATE",
  CASE WHEN has_delete OR has_all THEN '✓' ELSE '✗' END as "DELETE"
FROM policy_coverage
WHERE tablename IN (
  'channels', 'channel_links', 'channel_brandings',
  'organizations', 'organization_members',
  'profiles', 'subscriptions', 'plan_keys', 'projects'
)
ORDER BY tablename;
