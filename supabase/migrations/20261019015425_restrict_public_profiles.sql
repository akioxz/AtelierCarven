-- Keep private profile fields behind owner/admin RLS. Public reviews use a
-- deliberately narrow RPC instead of requiring public SELECT on profiles.
-- Apply through the migration runner as one transaction, before the app update.

alter table public.profiles enable row level security;

drop policy if exists "Public read profiles for review authors" on public.profiles;
revoke select on public.profiles from public, anon;

-- Retain the owner path and restore the admin path removed by the policy
-- reconciliation migration (admin orders still embed profiles).
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "Admins read all profiles" on public.profiles;
create policy "Admins read all profiles"
  on public.profiles for select to authenticated
  using ((select private.is_admin()));

grant select on public.profiles to authenticated;

-- Reviews are already public. Only the author's display name is projected
-- here: no profile ID, email, address, phone, role, or arbitrary profile lookup.
-- SECURITY DEFINER is required to read the name after profiles become private.
-- All relations are qualified and the search path excludes writable schemas.
create or replace function public.get_furniture_reviews(p_furniture_id uuid)
returns table (
  id uuid,
  rating smallint,
  comment text,
  created_at timestamptz,
  author_username text
)
language sql
stable
security definer
set search_path = ''
as $function$
  select review.id, review.rating, review.comment, review.created_at,
         author.username::text as author_username
  from public.reviews as review
  left join public.profiles as author on author.id = review.user_id
  where review.furniture_id = p_furniture_id;
$function$;

revoke all on function public.get_furniture_reviews(uuid) from public, anon, authenticated;
grant execute on function public.get_furniture_reviews(uuid) to anon, authenticated;

notify pgrst, 'reload schema';
