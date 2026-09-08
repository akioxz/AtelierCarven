-- 20260908000003_harden_is_admin.sql
--
-- Remove public.is_admin() from the Data API attack surface.
--
-- is_admin() backs 16 admin RLS policies, so it must keep working inside
-- policy evaluation while no longer being callable via
-- POST /rest/v1/rpc/is_admin by the anon/authenticated roles.
--
-- Moving it to the unexposed `private` schema achieves both:
-- PostgREST only serves exposed schemas, so the RPC endpoint disappears,
-- while existing policies keep resolving (PostgreSQL binds policy function
-- calls by OID, which ALTER ... SET SCHEMA preserves).
-- USAGE + EXECUTE for anon/authenticated are re-granted so policy
-- evaluation behaves exactly as before (the function only returns a
-- boolean over auth.uid(), leaking no data).
--
-- Out of scope (already hardened in 20260903000000_security_hardening):
-- public.is_current_user_admin() has EXECUTE revoked from
-- public/anon/authenticated and is only invoked by trigger functions.

create schema if not exists private;

revoke all on schema private from public;

grant usage on schema private to anon, authenticated;

alter function public.is_admin() set schema private;

revoke all on function private.is_admin() from public;

grant execute on function private.is_admin() to anon, authenticated;
