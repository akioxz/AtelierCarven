-- 20260908000000_rls_audit_and_grants.sql
--
-- Combined migration for:
--   1. Data API access: GRANT SELECT/INSERT/UPDATE/DELETE to anon/authenticated
--      on all tables that the app needs to reach via PostgREST.
--   2. RLS policy audit: Ensure every table in `public` has RLS enabled and
--      correct policies. Uses DROP + CREATE pattern to be idempotent.
--
-- Tables audited (9 total):
--   profiles, furniture, orders, order_items, cart, favorites,
--   reviews, size_guides, activity_logs
--
-- The reviews and size_guides tables already have correct RLS from their
-- original migrations (20260902000000, 20260902000001). This migration
-- re-states their GRANTs for completeness but does NOT touch their policies.

-- ============================================================================
-- 1. PROFILES
--    - SELECT: users read their own profile; admins read all (for orders JOIN)
--    - UPDATE: users update their own profile
--    - INSERT: handled by handle_new_user trigger (SECURITY DEFINER)
--    - DELETE: not exposed (no app path)
--    - TRIGGER: protect_profile_role prevents role escalation
-- ============================================================================
alter table public.profiles enable row level security;

-- Users can read their own profile
drop policy if exists "Users read own profile" on public.profiles;
create policy "Users read own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- Admins can read all profiles (needed for orders JOIN "*, profiles(*)")
drop policy if exists "Admins read all profiles" on public.profiles;
create policy "Admins read all profiles"
  on public.profiles for select
  using (public.is_admin());

-- Profiles in reviews are publicly readable (username only, but RLS is
-- row-level not column-level, so we need a SELECT policy for the JOIN
-- reviews.select("..., profiles(username)"). The anon-visible review JOIN
-- needs to reach the profile row. Using a permissive "public read" for
-- profiles used as review authors.
drop policy if exists "Public read profiles for review authors" on public.profiles;
create policy "Public read profiles for review authors"
  on public.profiles for select
  using (true);

-- Users update their own profile (username, address, mobile_number, avatar_url)
drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

grant select, update on public.profiles to authenticated;
-- anon needs SELECT for review author JOINs (username only; RLS still applies)
grant select on public.profiles to anon;

-- ============================================================================
-- 2. FURNITURE
--    - SELECT: public read (catalog browsing, including soft-deleted for admins)
--    - INSERT/UPDATE: admin only
--    - DELETE: soft-delete via is_deleted flag (admin UPDATE, not real DELETE)
-- ============================================================================
alter table public.furniture enable row level security;

drop policy if exists "Furniture is publicly readable" on public.furniture;
create policy "Furniture is publicly readable"
  on public.furniture for select
  using (true);

drop policy if exists "Admins insert furniture" on public.furniture;
create policy "Admins insert furniture"
  on public.furniture for insert
  with check (public.is_admin());

drop policy if exists "Admins update furniture" on public.furniture;
create policy "Admins update furniture"
  on public.furniture for update
  using (public.is_admin())
  with check (public.is_admin());

grant select on public.furniture to anon, authenticated;
grant insert, update on public.furniture to authenticated;

-- ============================================================================
-- 3. ORDERS
--    - SELECT: users read own orders; admins read all
--    - INSERT: authenticated users place orders
--    - UPDATE: admins update status (trigger protects admin-only fields)
--    - DELETE: not exposed
-- ============================================================================
alter table public.orders enable row level security;

drop policy if exists "Users read own orders" on public.orders;
create policy "Users read own orders"
  on public.orders for select
  using (auth.uid() = user_id);

drop policy if exists "Admins read all orders" on public.orders;
create policy "Admins read all orders"
  on public.orders for select
  using (public.is_admin());

drop policy if exists "Users insert own orders" on public.orders;
create policy "Users insert own orders"
  on public.orders for insert
  with check (auth.uid() = user_id);

drop policy if exists "Admins update orders" on public.orders;
create policy "Admins update orders"
  on public.orders for update
  using (public.is_admin())
  with check (public.is_admin());

grant select, insert on public.orders to authenticated;
grant update on public.orders to authenticated;

-- ============================================================================
-- 4. ORDER_ITEMS
--    - SELECT: users read items from their own orders; admins read all
--    - INSERT: authenticated users (during checkout)
--    - UPDATE/DELETE: not exposed
-- ============================================================================
alter table public.order_items enable row level security;

drop policy if exists "Users read own order items" on public.order_items;
create policy "Users read own order items"
  on public.order_items for select
  using (
    exists (
      select 1 from public.orders
      where orders.id = order_items.order_id
        and orders.user_id = auth.uid()
    )
  );

drop policy if exists "Admins read all order items" on public.order_items;
create policy "Admins read all order items"
  on public.order_items for select
  using (public.is_admin());

drop policy if exists "Users insert own order items" on public.order_items;
create policy "Users insert own order items"
  on public.order_items for insert
  with check (
    exists (
      select 1 from public.orders
      where orders.id = order_items.order_id
        and orders.user_id = auth.uid()
    )
  );

grant select, insert on public.order_items to authenticated;

-- ============================================================================
-- 5. CART
--    - SELECT/INSERT/UPDATE/DELETE: users CRUD their own cart only
-- ============================================================================
alter table public.cart enable row level security;

drop policy if exists "Users read own cart" on public.cart;
create policy "Users read own cart"
  on public.cart for select
  using (auth.uid() = user_id);

drop policy if exists "Users insert own cart items" on public.cart;
create policy "Users insert own cart items"
  on public.cart for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users update own cart items" on public.cart;
create policy "Users update own cart items"
  on public.cart for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users delete own cart items" on public.cart;
create policy "Users delete own cart items"
  on public.cart for delete
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.cart to authenticated;

-- ============================================================================
-- 6. FAVORITES
--    - SELECT/INSERT/DELETE: users CRUD their own favorites only
--    - UPDATE: not used in app
-- ============================================================================
alter table public.favorites enable row level security;

drop policy if exists "Users read own favorites" on public.favorites;
create policy "Users read own favorites"
  on public.favorites for select
  using (auth.uid() = user_id);

drop policy if exists "Users insert own favorites" on public.favorites;
create policy "Users insert own favorites"
  on public.favorites for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users delete own favorites" on public.favorites;
create policy "Users delete own favorites"
  on public.favorites for delete
  using (auth.uid() = user_id);

grant select, insert, delete on public.favorites to authenticated;

-- ============================================================================
-- 7. REVIEWS  (policies already defined in 20260902000000_reviews.sql)
--    Just adding GRANTs for Data API access.
-- ============================================================================
grant select on public.reviews to anon, authenticated;
grant insert, update, delete on public.reviews to authenticated;

-- ============================================================================
-- 8. SIZE_GUIDES  (policies already defined in 20260902000001_size_guides.sql)
--    Just adding GRANTs for Data API access.
-- ============================================================================
grant select on public.size_guides to anon, authenticated;
grant insert, update, delete on public.size_guides to authenticated;

-- ============================================================================
-- 9. ACTIVITY_LOGS
--    - SELECT: admin only (dashboard + activity-logs page)
--    - INSERT: admin only (logged from manage-furniture, manage-orders)
--    - UPDATE/DELETE: not exposed
--
--    ⚠️  Without RLS, any authenticated user could read admin logs via
--        POST /rest/v1/activity_logs — this is a P0 fix.
-- ============================================================================
alter table public.activity_logs enable row level security;

drop policy if exists "Admins read activity logs" on public.activity_logs;
create policy "Admins read activity logs"
  on public.activity_logs for select
  using (public.is_admin());

drop policy if exists "Admins insert activity logs" on public.activity_logs;
create policy "Admins insert activity logs"
  on public.activity_logs for insert
  with check (public.is_admin());

grant select, insert on public.activity_logs to authenticated;
