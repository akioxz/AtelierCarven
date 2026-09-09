-- 20260908000001_furniture_images.sql
--
-- Migration for multi-image support (Gallery).
-- Primary images remain in `furniture.image_url`.

create table public.furniture_images (
    id uuid primary key default gen_random_uuid(),
    furniture_id uuid not null references public.furniture(id) on delete cascade,
    image_url text not null,
    display_order integer not null default 0,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.furniture_images enable row level security;

create policy "Furniture images are publicly readable"
  on public.furniture_images for select
  using (true);

create policy "Admins insert furniture images"
  on public.furniture_images for insert
  with check (public.is_admin());

create policy "Admins update furniture images"
  on public.furniture_images for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins delete furniture images"
  on public.furniture_images for delete
  using (public.is_admin());

grant select on public.furniture_images to anon, authenticated;
grant insert, update, delete on public.furniture_images to authenticated;
