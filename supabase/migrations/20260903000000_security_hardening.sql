-- 20260903000000_security_hardening.sql
-- Security hardening driven by Supabase security advisors.
--
-- 1. Pin search_path on handle_new_user (function_search_path_mutable advisor).
--    As a SECURITY DEFINER function with no search_path it was vulnerable to
--    function/table hijacking via a malicious object shadowing a referenced name.
--
-- 2. Revoke RPC execution from anon/authenticated on functions that are meant
--    to run only as database triggers or internal helpers. SECURITY DEFINER
--    functions in the exposed `public` schema are otherwise callable by any
--    `anon`/`authenticated` role via POST /rest/v1/rpc/<fn> (the
--    anon_security_definer_function_executable /
--    authenticated_security_definer_function_executable advisors).
--
--    Revoked:
--      - handle_new_user()            (trigger on auth.users)
--      - recompute_furniture_rating() (trigger on reviews)
--      - protect_order_admin_fields() (trigger on orders)
--      - protect_profile_role()       (trigger on profiles)
--      - is_current_user_admin()      (internal helper called by the triggers)
--
--    Kept executable (intentional, required):
--      - is_admin()  (referenced directly inside size_guides RLS policies, so
--                     anon/authenticated must retain EXECUTE for the policies
--                     to evaluate)

-- 1. handle_new_user: pin search_path and remove RPC exposure.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  insert into public.profiles (id, email, username, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'username', 'User'),
    'user'
  );
  return new;
end;
$function$;

-- 2. Remove RPC execution for trigger-only and internal-helper functions.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.recompute_furniture_rating() from public, anon, authenticated;
revoke execute on function public.protect_order_admin_fields() from public, anon, authenticated;
revoke execute on function public.protect_profile_role() from public, anon, authenticated;
revoke execute on function public.is_current_user_admin() from public, anon, authenticated;
