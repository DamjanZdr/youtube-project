-- 002_add_attribution_to_profiles.sql
alter table profiles
add column utm_source text,
add column utm_medium text,
add column utm_campaign text,
add column utm_term text,
add column utm_content text,
add column device_type text,
add column user_agent text,
add column platform text,
add column language text,
add column country text,
add column city text;
