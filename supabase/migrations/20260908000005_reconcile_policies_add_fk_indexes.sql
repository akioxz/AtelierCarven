-- 20260908000005_reconcile_policies_add_fk_indexes.sql
--
-- Reconcile RLS policies to one canonical policy per role/command-group and
-- add covering indexes for unindexed foreign keys.
-- Supabase advisors: multiple_permissive_policies + unindexed_foreign_keys.
--
-- Every drop below is covered by a kept policy with an identical predicate:
-- FOR ALL "manage own X" policies subsume the per-action singles; the kept
-- admin policies use private.is_admin() (see 20260908000003). Anon callers
-- never matched uid-based predicates (auth.uid() is null for anon), so
-- narrowing TO roles from public to authenticated changes no effective access.
-- One deliberate behavior change: the blanket "Furniture is publicly
-- readable" (qual = true) is removed, leaving "Anyone can view active
-- furniture" (is_deleted = false) as the public path, so soft-deleted
-- furniture is no longer publicly visible.

-- profiles: drop exact duplicates (keepers already initplan-fixed)
drop policy if exists "Admins read all profiles" on public.profiles;
drop policy if exists "Users read own profile" on public.profiles;
drop policy if exists "Users update own profile" on public.profiles;

-- furniture: drop covered admin singles + blanket public read
drop policy if exists "Admins insert furniture" on public.furniture;
drop policy if exists "Admins update furniture" on public.furniture;
drop policy if exists "Furniture is publicly readable" on public.furniture;

-- activity_logs: FOR ALL manage covers both singles
drop policy if exists "Admins insert activity logs" on public.activity_logs;
drop policy if exists "Admins read activity logs" on public.activity_logs;

-- cart: FOR ALL manage covers all four per-action policies + the ALL duplicate
drop policy if exists "Users read/insert/update/delete own cart items" on public.cart;
drop policy if exists "Users read own cart" on public.cart;
drop policy if exists "Users insert own cart items" on public.cart;
drop policy if exists "Users update own cart items" on public.cart;
drop policy if exists "Users delete own cart items" on public.cart;

-- favorites: same pattern
drop policy if exists "Users read/insert/delete own favorites" on public.favorites;
drop policy if exists "Users read own favorites" on public.favorites;
drop policy if exists "Users insert own favorites" on public.favorites;
drop policy if exists "Users delete own favorites" on public.favorites;

-- reviews: FOR ALL covers the three per-action policies (public read kept)
drop policy if exists "Users insert their own reviews" on public.reviews;
drop policy if exists "Users update their own reviews" on public.reviews;
drop policy if exists "Users delete their own reviews" on public.reviews;

-- order_items: FOR ALL manage + admin read cover the rest
drop policy if exists "Users read/insert own order items" on public.order_items;
drop policy if exists "Users insert own order items" on public.order_items;
drop policy if exists "Users read own order items" on public.order_items;

-- orders: FOR ALL admin + FOR ALL user cover all seven (including the two
-- old-style auth.uid() IN (SELECT ...) policies superseded by private.is_admin())
drop policy if exists "Admins can view all orders" on public.orders;
drop policy if exists "Admins can update all orders" on public.orders;
drop policy if exists "Admins read all orders" on public.orders;
drop policy if exists "Admins update orders" on public.orders;
drop policy if exists "Users insert own orders" on public.orders;
drop policy if exists "Users read own orders" on public.orders;
drop policy if exists "Users read/insert own orders" on public.orders;

-- covering indexes for the 8 unindexed foreign keys
create index if not exists idx_activity_logs_admin_id on public.activity_logs (admin_id);
create index if not exists idx_cart_furniture_id on public.cart (furniture_id);
create index if not exists idx_cart_user_id on public.cart (user_id);
create index if not exists idx_favorites_furniture_id on public.favorites (furniture_id);
create index if not exists idx_furniture_images_furniture_id on public.furniture_images (furniture_id);
create index if not exists idx_order_items_furniture_id on public.order_items (furniture_id);
create index if not exists idx_order_items_order_id on public.order_items (order_id);
create index if not exists idx_orders_user_id on public.orders (user_id);
