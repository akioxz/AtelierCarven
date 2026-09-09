-- 20260908000004_rls_initplan.sql
--
-- Wrap bare auth.uid() calls in (select auth.uid()) to avoid per-row re-evaluation.
-- Supabase advisor: auth_rls_initplan WARN x26
--
-- For each affected table, drop + recreate each policy using (select auth.uid())
-- instead of bare auth.uid(). Semantically identical; avoids per-row initplan.

-- profiles (4 policies)
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists "Users read own profile" on public.profiles;
create policy "Users read own profile"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- cart (2 policies)
drop policy if exists "Users can manage own cart" on public.cart;
create policy "Users can manage own cart"
  on public.cart for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users read/insert/update/delete own cart items" on public.cart;
create policy "Users read/insert/update/delete own cart items"
  on public.cart for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- favorites (2 policies)
drop policy if exists "Users can manage own favorites" on public.favorites;
create policy "Users can manage own favorites"
  on public.favorites for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users read/insert/delete own favorites" on public.favorites;
create policy "Users read/insert/delete own favorites"
  on public.favorites for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- orders (4 policies)
drop policy if exists "Users can manage own orders" on public.orders;
create policy "Users can manage own orders"
  on public.orders for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Admins can view/update all orders" on public.orders;
create policy "Admins can view/update all orders"
  on public.orders for all to authenticated
  using (private.is_admin())
  with check (private.is_admin());

drop policy if exists "Users read/insert own orders" on public.orders;
create policy "Users read/insert own orders"
  on public.orders for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users insert own orders" on public.orders;
create policy "Users insert own orders"
  on public.orders for insert to authenticated
  with check ((select auth.uid()) = user_id);

-- order_items (2 policies)
drop policy if exists "Users can manage own order items" on public.order_items;
create policy "Users can manage own order items"
  on public.order_items for all to authenticated
  using (exists (select 1 from public.orders where orders.id = order_items.order_id and orders.user_id = (select auth.uid())))
  with check (exists (select 1 from public.orders where orders.id = order_items.order_id and orders.user_id = (select auth.uid())));

drop policy if exists "Users read/insert own order items" on public.order_items;
create policy "Users read/insert own order items"
  on public.order_items for select to authenticated
  using (exists (select 1 from public.orders where orders.id = order_items.order_id and orders.user_id = (select auth.uid())));

-- furniture (2 policies)
drop policy if exists "Admins can manage furniture" on public.furniture;
create policy "Admins can manage furniture"
  on public.furniture for all to authenticated
  using (private.is_admin())
  with check (private.is_admin());

-- activity_logs (2 policies)
drop policy if exists "Admins can manage activity logs" on public.activity_logs;
create policy "Admins can manage activity logs"
  on public.activity_logs for all to authenticated
  using (private.is_admin())
  with check (private.is_admin());

-- reviews (2 policies)
drop policy if exists "Users insert/update/delete their own reviews" on public.reviews;
create policy "Users insert/update/delete their own reviews"
  on public.reviews for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);