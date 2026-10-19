-- Forward repair for the remaining commerce audit findings.
-- Existing table policies/grants remain in force.
alter table public.order_items add column if not exists color text;
alter table public.order_items add column if not exists material text;

-- One RPC call is one transaction: never leave an order without all its lines,
-- or remove the cart unless the complete order has been saved.
-- The client total is an expected-value check; the locked server snapshot is authoritative.
create or replace function public.checkout_cart(
  p_total numeric,
  p_address text,
  p_payment_method text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_order_id uuid;
  v_lines jsonb;
  v_line_count integer;
  v_written integer;
  v_total numeric;
begin
  if v_user_id is null then
    raise exception 'Sign in required' using errcode = '42501';
  end if;
  if p_total is null or p_total <= 0
     or p_total::text in ('NaN', 'Infinity', '-Infinity') then
    raise exception 'Invalid order total' using errcode = '22023';
  end if;
  if p_payment_method is null or p_payment_method not in ('cod', 'gcash', 'maya', 'card') then
    raise exception 'Invalid payment method' using errcode = '22023';
  end if;

  -- Deterministic locks serialize checkouts of the same cart. A concurrent
  -- checkout that waited for these rows will find them deleted after commit.
  -- LEFT JOIN retains unavailable furniture so it fails instead of disappearing.
  select jsonb_agg(to_jsonb(line)) into v_lines
  from (
    select cart.id, cart.furniture_id, cart.quantity, cart.color, cart.material,
           round(case when furniture.sale_price > 0 and furniture.sale_price < furniture.price
                      then furniture.sale_price else furniture.price end, 2) as price
    from public.cart as cart
    left join public.furniture as furniture on furniture.id = cart.furniture_id
    where cart.user_id = v_user_id
    order by cart.id
    for update of cart
  ) as line;

  v_line_count := coalesce(jsonb_array_length(v_lines), 0);
  if v_line_count = 0 then
    raise exception 'Cart is empty' using errcode = 'P0002';
  end if;
  if exists (
    select 1 from jsonb_to_recordset(v_lines)
      as line(id uuid, furniture_id uuid, quantity integer, price numeric)
    where line.furniture_id is null or line.price is null or line.price <= 0
       or line.price::text in ('NaN', 'Infinity', '-Infinity')
       or line.quantity is null or line.quantity <= 0
  ) then
    raise exception 'A cart item is unavailable' using errcode = '22023';
  end if;

  select sum(line.quantity * line.price) into v_total
  from jsonb_to_recordset(v_lines) as line(quantity integer, price numeric);
  if p_total <> v_total then
    raise exception 'Cart changed. Review its current prices and quantities.' using errcode = '22023';
  end if;

  insert into public.orders (user_id, total, status, address, payment_method)
  values (v_user_id, v_total, 'Pending', p_address, p_payment_method)
  returning id into v_order_id;
  if v_order_id is null then
    raise exception 'Order was not saved';
  end if;

  insert into public.order_items (order_id, furniture_id, quantity, price, color, material)
  select v_order_id, line.furniture_id, line.quantity, line.price, line.color, line.material
  from jsonb_to_recordset(v_lines)
    as line(id uuid, furniture_id uuid, quantity integer, price numeric, color text, material text);
  get diagnostics v_written = row_count;
  if v_written <> v_line_count then
    raise exception 'Not all order items were saved';
  end if;

  -- Preserve cart additions made after this checkout's snapshot.
  delete from public.cart as cart
  using jsonb_to_recordset(v_lines) as line(id uuid)
  where cart.id = line.id and cart.user_id = v_user_id;
  get diagnostics v_written = row_count;
  if v_written <> v_line_count then
    raise exception 'Checked-out cart items were not removed';
  end if;

  return v_order_id;
end;
$function$;

revoke all on function public.checkout_cart(numeric, text, text) from public, anon, authenticated;
grant execute on function public.checkout_cart(numeric, text, text) to authenticated;
notify pgrst, 'reload schema';

-- Purchased variants are historical facts, independent of later cart/catalog edits.
create or replace function public.protect_order_variant_snapshot()
returns trigger language plpgsql security invoker set search_path='' as $function$
begin
  if new.color is distinct from old.color or new.material is distinct from old.material then
    raise exception 'Purchased variants cannot be changed' using errcode='23514';
  end if;
  return new;
end;
$function$;
revoke all on function public.protect_order_variant_snapshot() from public,anon,authenticated;
create trigger order_items_protect_variant_snapshot
before update of color,material on public.order_items
for each row execute function public.protect_order_variant_snapshot();

-- Serialize additions per owner, including the first insertion of a variant.
create or replace function public.add_cart_item(
  p_furniture_id uuid, p_quantity integer default 1,
  p_color text default null, p_material text default null
) returns uuid language plpgsql security invoker set search_path='' as $function$
declare v_user uuid:=auth.uid(); v_id uuid;
begin
  if v_user is null then raise exception 'Sign in required' using errcode='42501'; end if;
  if p_quantity is null or p_quantity<1 then raise exception 'Invalid quantity' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_user::text,0));
  if not exists(select 1 from public.furniture where id=p_furniture_id and is_deleted=false) then
    raise exception 'This item is unavailable' using errcode='22023';
  end if;
  select id into v_id from public.cart
  where user_id=v_user and furniture_id=p_furniture_id
    and color is not distinct from p_color and material is not distinct from p_material
  order by id limit 1 for update;
  if v_id is null then
    insert into public.cart(user_id,furniture_id,quantity,color,material)
    values(v_user,p_furniture_id,p_quantity,p_color,p_material) returning id into v_id;
  else
    update public.cart set quantity=quantity+p_quantity where id=v_id and user_id=v_user returning id into v_id;
  end if;
  if v_id is null then raise exception 'Cart item was not saved'; end if;
  return v_id;
end;
$function$;
revoke all on function public.add_cart_item(uuid,integer,text,text) from public,anon,authenticated;
grant execute on function public.add_cart_item(uuid,integer,text,text) to authenticated;

create or replace function public.change_cart_quantity(p_cart_id uuid,p_delta integer)
returns integer language plpgsql security invoker set search_path='' as $function$
declare v_user uuid:=auth.uid(); v_quantity integer; v_written integer;
begin
  if v_user is null then raise exception 'Sign in required' using errcode='42501'; end if;
  if p_delta is null or p_delta not in (-1,1) then raise exception 'Invalid quantity change' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_user::text,0));
  select quantity into v_quantity from public.cart where id=p_cart_id and user_id=v_user for update;
  if not found then raise exception 'Cart item no longer exists' using errcode='P0002'; end if;
  v_quantity:=v_quantity+p_delta;
  if v_quantity=0 then
    delete from public.cart where id=p_cart_id and user_id=v_user;
  else
    update public.cart set quantity=v_quantity where id=p_cart_id and user_id=v_user;
  end if;
  get diagnostics v_written=row_count;
  if v_written<>1 then raise exception 'Cart quantity was not saved'; end if;
  return v_quantity;
end;
$function$;
revoke all on function public.change_cart_quantity(uuid,integer) from public,anon,authenticated;
grant execute on function public.change_cart_quantity(uuid,integer) to authenticated;

-- Server aggregation is independent of the PostgREST maximum response size.
create or replace function public.admin_dashboard_summary()
returns jsonb language plpgsql stable security invoker set search_path='' as $function$
begin
  if auth.uid() is null or private.is_admin() is not true then
    raise exception 'Administrator access required' using errcode='42501';
  end if;
  return jsonb_build_object(
    'furniture',(select count(*) from public.furniture where is_deleted=false),
    'users',(select count(*) from public.profiles where role='user'),
    'logs',(select count(*) from public.activity_logs),
    'orders',(select count(*) from public.orders where coalesce(lower(status),'pending')<>'cancelled'),
    'pending',(select count(*) from public.orders where lower(status)='pending'),
    'revenue',(select coalesce(sum(total),0) from public.orders where coalesce(lower(status),'pending')<>'cancelled')
  );
end;
$function$;
revoke all on function public.admin_dashboard_summary() from public,anon,authenticated;
grant execute on function public.admin_dashboard_summary() to authenticated;

-- Lock affected parent rows in a consistent order before reading aggregates.
-- SECURITY DEFINER is retained solely for trigger-maintained furniture fields.
create or replace function public.recompute_furniture_rating()
returns trigger language plpgsql security definer set search_path='' as $function$
declare v_ids uuid[]; v_id uuid;
begin
  if tg_op='INSERT' then v_ids:=array[new.furniture_id];
  elsif tg_op='DELETE' then v_ids:=array[old.furniture_id];
  else v_ids:=array[old.furniture_id,new.furniture_id]; end if;
  perform id from public.furniture where id=any(v_ids) order by id for update;
  for v_id in select distinct unnest(v_ids) loop
    update public.furniture set
      rating=(select coalesce(round(avg(rating)::numeric,1),0) from public.reviews where furniture_id=v_id),
      review_count=(select count(*) from public.reviews where furniture_id=v_id)
    where id=v_id;
  end loop;
  return null;
end;
$function$;
revoke all on function public.recompute_furniture_rating() from public,anon,authenticated;

-- Replace prior illustrative values with aggregates from actual stored reviews.
update public.furniture as furniture set
  rating=(select coalesce(round(avg(rating)::numeric,1),0) from public.reviews where furniture_id=furniture.id),
  review_count=(select count(*) from public.reviews where furniture_id=furniture.id);
notify pgrst,'reload schema';
