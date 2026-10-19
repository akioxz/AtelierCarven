-- Purchased lines are append-only for API callers. Checkout remains an
-- invoker function and retains INSERT; customers/admins retain SELECT.
revoke update, delete on public.order_items from public, anon, authenticated;
-- Explicit column grants survive a table-level REVOKE.
revoke update (id, order_id, furniture_id, quantity, price, color, material)
  on public.order_items from public, anon, authenticated;

-- Prevent an API caller from bypassing line protection through ON DELETE
-- CASCADE on the parent. Order cancellation/status updates remain available.
revoke delete on public.orders from public, anon, authenticated;

-- TRUNCATE bypasses row policies and has no place in an API role.
revoke truncate on public.profiles, public.orders, public.order_items
  from public, anon, authenticated;

notify pgrst, 'reload schema';
