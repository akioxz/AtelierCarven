-- Run with psql -X --set ON_ERROR_STOP=1 --file supabase/tests/profile_privacy.sql
-- against a NEW, EMPTY LOCAL database named ateliercarven_profile_privacy_test.
-- An ephemeral PGlite database (its default name is postgres) is also accepted.
-- Requires a test superuser to create temporary roles and emulate API roles.
-- This is a minimal privacy fixture, not a replay of the incomplete base schema.
\set ON_ERROR_STOP on
begin;

do $test$
begin
  if (current_database() <> 'ateliercarven_profile_privacy_test'
      and not (current_database() = 'postgres' and pg_catalog.version() like '%(PGlite %'))
     or coalesce(inet_server_addr()::text, '127.0.0.1') not in ('127.0.0.1', '::1') then
    raise exception 'Use a dedicated local ateliercarven_profile_privacy_test database';
  end if;
  if to_regclass('public.profiles') is not null
     or to_regnamespace('auth') is not null
     or to_regnamespace('private') is not null then
    raise exception 'Fixture requires an empty database; refusing to overwrite existing objects';
  end if;
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if exists (select 1 from pg_roles where rolname in ('anon', 'authenticated') and (rolsuper or rolbypassrls)) then
    raise exception 'API fixture roles must not bypass RLS';
  end if;
end;
$test$;

create schema auth;
create schema private;
grant usage on schema public, auth, private to anon, authenticated;

create function auth.uid() returns uuid language sql stable
  as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;

create table public.profiles (
  id uuid primary key, username text, email text, address text,
  mobile_number text, role text not null
);
create table public.reviews (
  id uuid primary key, furniture_id uuid not null,
  user_id uuid references public.profiles(id), rating smallint not null,
  comment text, created_at timestamptz not null
);
create table public.orders (
  id uuid primary key, user_id uuid references public.profiles(id)
);

create function private.is_admin() returns boolean language sql stable
  security definer set search_path = ''
  as $$ select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') $$;
revoke all on function private.is_admin() from public;
grant execute on function private.is_admin() to authenticated;

insert into public.profiles values
  ('00000000-0000-0000-0000-000000000001', 'Owner A', 'a@example.invalid', 'Private address A', '111', 'user'),
  ('00000000-0000-0000-0000-000000000002', 'Reviewer B', 'b@example.invalid', 'Private address B', '222', 'user'),
  ('00000000-0000-0000-0000-000000000003', 'Admin', 'admin@example.invalid', 'Private admin address', '333', 'admin');
insert into public.reviews values
  ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000002', 5, 'Public review', '2026-10-19T00:00:00Z');
insert into public.orders values
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002');

alter table public.profiles enable row level security;
alter table public.reviews enable row level security;
alter table public.orders enable row level security;
create policy "Users can view own profile" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
-- Deliberately reproduce the vulnerable policy/grants as the negative control.
create policy "Public read profiles for review authors" on public.profiles for select using (true);
grant select on public.profiles to public, anon, authenticated;
grant update on public.profiles to authenticated;
create policy "Reviews are publicly readable" on public.reviews for select using (true);
grant select on public.reviews to anon, authenticated;
create policy "Owners and admins read orders" on public.orders for select to authenticated
  using (auth.uid() = user_id or private.is_admin());
grant select on public.orders to authenticated;

set local role anon;
do $test$
begin
  if (select count(*) from public.profiles) <> 3 then
    raise exception 'Negative control did not reproduce the public profile exposure';
  end if;
end;
$test$;
reset role;

\ir ../migrations/20261019015425_restrict_public_profiles.sql

set local role anon;
do $test$
declare projected jsonb;
begin
  begin
    perform * from public.profiles;
    raise exception 'Anonymous callers can still select profiles';
  exception when insufficient_privilege then
    null;
  end;
  select to_jsonb(review) into projected
    from public.get_furniture_reviews('20000000-0000-0000-0000-000000000001') as review;
  if projected is null or projected->>'author_username' is distinct from 'Reviewer B'
     or projected->>'comment' is distinct from 'Public review' then
    raise exception 'Anonymous public review/name display regressed';
  end if;
  if (select array_agg(key order by key) from jsonb_object_keys(projected) as keys(key))
       is distinct from array['author_username', 'comment', 'created_at', 'id', 'rating'] then
    raise exception 'RPC output contains unexpected/private fields';
  end if;
  if exists (select 1 from public.get_furniture_reviews('20000000-0000-0000-0000-000000000002'))
     or exists (select 1 from public.get_furniture_reviews(null)) then
    raise exception 'RPC returned unrelated rows';
  end if;
end;
$test$;
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
do $test$
begin
  if (select count(*) from public.profiles) <> 1
     or (select email from public.profiles) is distinct from 'a@example.invalid' then
    raise exception 'Owner full-profile read is broken or exposes other rows';
  end if;
  if exists (select 1 from public.profiles where id = '00000000-0000-0000-0000-000000000002') then
    raise exception 'Cross-user filtered profile read bypassed RLS';
  end if;
  if (select count(*) from public.profiles where id = '00000000-0000-0000-0000-000000000002' or true) <> 1 then
    raise exception 'OR filter bypassed the owner read boundary';
  end if;
  if exists (select 1 from public.reviews review join public.profiles author on author.id = review.user_id) then
    raise exception 'Direct review embedding exposed another user profile';
  end if;
  if (select author_username from public.get_furniture_reviews('20000000-0000-0000-0000-000000000001')) is distinct from 'Reviewer B' then
    raise exception 'Authenticated public reviewer display regressed';
  end if;
  update public.profiles set username = 'Owner A updated' where id = '00000000-0000-0000-0000-000000000001';
  if not found then raise exception 'Owner profile update regressed'; end if;
  update public.profiles set username = 'Forbidden' where id = '00000000-0000-0000-0000-000000000002';
  if found then raise exception 'Cross-user profile update unexpectedly succeeded'; end if;
end;
$test$;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000003', true);
do $test$
begin
  if (select count(*) from public.profiles) <> 3 then
    raise exception 'Admin profile/dashboard access regressed';
  end if;
  if (select count(*) from public.orders orders join public.profiles profile on profile.id = orders.user_id) <> 1 then
    raise exception 'Admin order/profile join regressed';
  end if;
end;
$test$;
reset role;

do $test$
begin
  if not exists (
    select 1 from pg_proc
    where oid = 'public.get_furniture_reviews(uuid)'::regprocedure
      and prosecdef and proconfig @> array['search_path=""']
  ) then
    raise exception 'Review RPC is missing its pinned definer boundary';
  end if;
  if exists (
    select 1 from pg_proc proc,
      lateral aclexplode(coalesce(proc.proacl, acldefault('f', proc.proowner))) entry
    where proc.oid = 'public.get_furniture_reviews(uuid)'::regprocedure
      and entry.grantee = 0 and entry.privilege_type = 'EXECUTE'
  ) then
    raise exception 'Review RPC still has implicit PUBLIC execution';
  end if;
end;
$test$;

rollback;
\echo 'Profile privacy fixture passed; all fixture changes rolled back.'
