-- 005_copy_location_to_profile.sql
-- Update the trigger to also copy location (country/city) from user metadata to profiles

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
    language = (select raw_user_meta_data->'device'->>'language' from auth.users where id = new.id),
    country = (select raw_user_meta_data->'location'->>'country' from auth.users where id = new.id),
    city = (select raw_user_meta_data->'location'->>'city' from auth.users where id = new.id)
  where id = new.id;
  return new;
end;
$$ language plpgsql security definer;
