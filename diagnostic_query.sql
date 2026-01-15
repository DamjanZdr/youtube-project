-- Diagnostic query to check default tasks setup
-- Run this in Supabase SQL Editor

-- 1. Check if default tasks exist
SELECT 
  bs.name as status_name,
  COUNT(sdt.id) as default_task_count
FROM board_statuses bs
LEFT JOIN status_default_tasks sdt ON sdt.status_id = bs.id
GROUP BY bs.id, bs.name
ORDER BY bs.position;

-- 2. Check if trigger exists
SELECT tgname, tgenabled 
FROM pg_trigger 
WHERE tgname = 'trigger_copy_default_tasks';

-- 3. Check a specific project
SELECT 
  p.id,
  p.title,
  p.board_status_id,
  bs.name as status_name,
  COUNT(pt.id) as task_count
FROM projects p
LEFT JOIN board_statuses bs ON bs.id = p.board_status_id
LEFT JOIN project_tasks pt ON pt.project_id = p.id
WHERE p.title = 'test' -- or whatever your project is named
GROUP BY p.id, p.title, p.board_status_id, bs.name;

-- 4. List all default tasks
SELECT 
  bs.name as status_name,
  sdt.name as task_name,
  sdt.position
FROM status_default_tasks sdt
JOIN board_statuses bs ON bs.id = sdt.status_id
ORDER BY bs.position, sdt.position;
