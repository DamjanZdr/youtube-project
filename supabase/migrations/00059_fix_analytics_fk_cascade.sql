-- Fix analytics_events foreign key to allow user deletion
-- The original FK had no ON DELETE behavior, blocking auth.users deletion

ALTER TABLE analytics_events 
DROP CONSTRAINT IF EXISTS analytics_events_user_id_fkey;

ALTER TABLE analytics_events 
ADD CONSTRAINT analytics_events_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL;
