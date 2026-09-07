-- 20260902000002_favorites_unique.sql
-- Prevent duplicate wishlist entries. Dedupes existing rows first so the
-- unique constraint can be added safely.

delete from public.favorites a
using public.favorites b
where a.user_id = b.user_id
  and a.furniture_id = b.furniture_id
  and a.created_at > b.created_at;

alter table public.favorites
  drop constraint if exists favorites_user_id_furniture_id_key;

alter table public.favorites
  add constraint favorites_user_id_furniture_id_key unique (user_id, furniture_id);