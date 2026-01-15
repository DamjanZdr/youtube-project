-- Delete all duplicate statuses (keeps the one with tasks)
WITH ranked_statuses AS (
  SELECT 
    bs.id,
    bs.organization_id,
    bs.name,
    bs.position,
    COUNT(sdt.id) as task_count,
    ROW_NUMBER() OVER (PARTITION BY bs.organization_id, bs.name ORDER BY COUNT(sdt.id) DESC, bs.created_at) as rn
  FROM board_statuses bs
  LEFT JOIN status_default_tasks sdt ON sdt.status_id = bs.id
  GROUP BY bs.id, bs.organization_id, bs.name, bs.position, bs.created_at
)
DELETE FROM board_statuses
WHERE id IN (
  SELECT id FROM ranked_statuses WHERE rn > 1
);
