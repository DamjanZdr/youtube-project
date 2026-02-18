-- 005_user_activity_stats.sql
-- Aggregated activity stats per user (not per-login entries)
-- Tracks login counts and time spent by device type

create table user_activity_stats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade unique not null,
  
  -- Login counts by device
  desktop_logins integer default 0,
  mobile_logins integer default 0,
  tablet_logins integer default 0,
  
  -- Total time spent in seconds by device
  desktop_time_seconds bigint default 0,
  mobile_time_seconds bigint default 0,
  tablet_time_seconds bigint default 0,
  
  -- Current session tracking (to calculate time on next login)
  current_session_start timestamp with time zone,
  current_session_device text, -- 'desktop', 'mobile', 'tablet'
  
  -- General tracking
  last_login_at timestamp with time zone,
  last_activity_at timestamp with time zone,
  
  created_at timestamp with time zone default timezone('utc', now()),
  updated_at timestamp with time zone default timezone('utc', now())
);

-- Index for fast lookups
create index idx_user_activity_stats_user_id on user_activity_stats(user_id);

-- Drop the analytics_events table if you want to clean up
-- (keeping it commented in case you want to keep raw event logs)
-- drop table if exists analytics_events;
