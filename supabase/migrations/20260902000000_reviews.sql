-- 20260902000000_reviews.sql
-- Customer reviews with per-user unique constraint and automatic
-- recomputation of furniture.rating / furniture.review_count.

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  furniture_id uuid not null references public.furniture (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reviews_user_furniture_unique unique (user_id, furniture_id)
);

create index if not exists reviews_furniture_idx on public.reviews (furniture_id);
create index if not exists reviews_user_idx on public.reviews (user_id);

alter table public.reviews enable row level security;

drop policy if exists "Reviews are publicly readable" on public.reviews;
create policy "Reviews are publicly readable"
  on public.reviews for select
  using (true);

drop policy if exists "Users insert their own reviews" on public.reviews;
create policy "Users insert their own reviews"
  on public.reviews for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users update their own reviews" on public.reviews;
create policy "Users update their own reviews"
  on public.reviews for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users delete their own reviews" on public.reviews;
create policy "Users delete their own reviews"
  on public.reviews for delete
  using (auth.uid() = user_id);

-- Recompute furniture.rating (avg) and review_count after any review change.
create or replace function public.recompute_furniture_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.furniture
  set rating = (
        select coalesce(round(avg(rating)::numeric, 1), 0)
        from public.reviews
        where furniture_id = coalesce(new.furniture_id, old.furniture_id)
      ),
      review_count = (
        select count(*)
        from public.reviews
        where furniture_id = coalesce(new.furniture_id, old.furniture_id)
      )
  where id = coalesce(new.furniture_id, old.furniture_id);
  return null;
end;
$$;

drop trigger if exists reviews_recompute_trigger on public.reviews;
create trigger reviews_recompute_trigger
  after insert or update or delete on public.reviews
  for each row
  execute function public.recompute_furniture_rating();