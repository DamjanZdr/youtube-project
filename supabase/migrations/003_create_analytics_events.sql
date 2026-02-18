-- 003_create_analytics_events.sql
create table analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  session_id text,
  event_type text, -- e.g. 'page_view', 'session_start', 'sign_up'
  page_url text,
  referrer text,
  device_type text,
  user_agent text,
  platform text,
  language text,
  country text,
  city text,
  created_at timestamp with time zone default timezone('utc', now())
);
