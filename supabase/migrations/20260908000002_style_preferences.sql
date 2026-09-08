-- 20260908000002_style_preferences.sql

-- 1. Add style_preferences column to profiles table
alter table public.profiles add column if not exists style_preferences jsonb default '[]'::jsonb;

-- 2. Update handle_new_user to capture style_preferences from metadata
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  insert into public.profiles (id, email, username, role, style_preferences)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'username', 'User'),
    'user',
    coalesce(new.raw_user_meta_data->'style_preferences', '[]'::jsonb)
  );
  return new;
end;
$function$;
