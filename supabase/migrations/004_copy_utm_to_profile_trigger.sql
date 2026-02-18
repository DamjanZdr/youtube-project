-- 004_copy_utm_to_profile_trigger.sql
-- This trigger copies UTM and device data from auth.users raw_user_meta_data to the profiles table
-- It runs when a new profile is created (typically via an existing trigger on auth.users insert)

create or replace function public.copy_utm_to_profile()
returns trigger as $$
begin
  update public.profiles
  set
    utm_source = (select raw_user_meta_data->'utm'->>'utm_source' from auth.users where id = new.id),
    utm_medium = (select raw_user_meta_data->'utm'->>'utm_medium' from auth.users where id = new.id),
    utm_campaign = (select raw_user_meta_data->'utm'->>'utm_campaign' from auth.users where id = new.id),
    utm_term = (select raw_user_meta_data->'utm'->>'utm_term' from auth.users where id = new.id),
    utm_content = (select raw_user_meta_data->'utm'->>'utm_content' from auth.users where id = new.id),
    device_type = (select raw_user_meta_data->'device'->>'device' from auth.users where id = new.id),
    user_agent = (select raw_user_meta_data->'device'->>'userAgent' from auth.users where id = new.id),
    platform = (select raw_user_meta_data->'device'->>'platform' from auth.users where id = new.id),
    language = (select raw_user_meta_data->'device'->>'language' from auth.users where id = new.id)
  where id = new.id;
  return new;
end;
$$ language plpgsql security definer;

-- Drop trigger if exists, then create
drop trigger if exists on_profile_created_copy_utm on public.profiles;
create trigger on_profile_created_copy_utm
  after insert on public.profiles
  for each row execute function public.copy_utm_to_profile();
