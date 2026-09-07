-- 20260902000001_size_guides.sql
-- Optional physical dimensions per furniture piece, shown on the product
-- page size-guide sheet and editable by admins.

create table if not exists public.size_guides (
  furniture_id uuid primary key references public.furniture (id) on delete cascade,
  width_cm numeric(7,1),
  height_cm numeric(7,1),
  depth_cm numeric(7,1),
  weight_kg numeric(6,2),
  updated_at timestamptz not null default now()
);

alter table public.size_guides enable row level security;

drop policy if exists "Size guides are publicly readable" on public.size_guides;
create policy "Size guides are publicly readable"
  on public.size_guides for select
  using (true);

-- Admin-only helper reused by size_guides (and future admin tables).
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

drop policy if exists "Admins insert size guides" on public.size_guides;
create policy "Admins insert size guides"
  on public.size_guides for insert
  with check (public.is_admin());

drop policy if exists "Admins update size guides" on public.size_guides;
create policy "Admins update size guides"
  on public.size_guides for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins delete size guides" on public.size_guides;
create policy "Admins delete size guides"
  on public.size_guides for delete
  using (public.is_admin());