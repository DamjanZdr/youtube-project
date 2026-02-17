-- Diagnostic query to check default tasks setup

-- 1. Check if default tasks exist
SELECT 
  bs.name as status_name,
  COUNT(sdt.id) as default_task_count
FROM board_statuses bs
LEFT JOIN status_default_tasks sdt ON sdt.status_id = bs.id
GROUP BY bs.id, bs.name
ORDER BY bs.position;
