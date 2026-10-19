-- Sort using the same rounded effective price displayed by the app.
alter table public.furniture add column effective_price numeric generated always as (
  round(case when sale_price > 0 and sale_price < price then sale_price else price end, 2)
) stored;

create or replace function public.checkout_cart(
  p_total numeric,
  p_address text,
  p_payment_method text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_order_id uuid;
  v_lines jsonb;
  v_line_count integer;
  v_written integer;
  v_total numeric;
  v_delivery text[];
begin
  if v_user_id is null then
    raise exception 'Sign in required' using errcode = '42501';
  end if;
  v_delivery := regexp_match(p_address, '^Name: (.*?) \| Mobile: (.*?) \| City: (.*?) \| Address: (.*?) \| Notes: (.*)$', 's');
  if v_delivery is null or exists(select 1 from unnest(v_delivery[1:4]) as field(value) where value !~ '[^[:space:]]') then
    raise exception 'Required delivery details are missing' using errcode = '22023';
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
      and furniture.is_deleted = false
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

-- Pin the trusted function owner rather than depending on the applying role.
alter function public.checkout_cart(numeric, text, text) owner to postgres;

notify pgrst, 'reload schema';
