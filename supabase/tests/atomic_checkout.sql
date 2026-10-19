-- psql -X --set ON_ERROR_STOP=1 --file supabase/tests/atomic_checkout.sql
-- NEW EMPTY LOCAL ateliercarven_checkout_test database, or ephemeral PGlite.
-- Minimal compatible schema/owner RLS; not a full migration-history replay.
\set ON_ERROR_STOP on
begin;
do $test$
begin
  if (current_database() <> 'ateliercarven_checkout_test'
      and not (current_database() = 'postgres' and version() like '%(PGlite %'))
     or coalesce(inet_server_addr()::text, '127.0.0.1') not in ('127.0.0.1', '::1') then
    raise exception 'Use a dedicated local checkout test database';
  end if;
  if to_regnamespace('auth') is not null or to_regclass('public.cart') is not null
     or to_regclass('public.orders') is not null or to_regclass('public.furniture') is not null
     or to_regclass('public.order_items') is not null then
    raise exception 'Fixture requires an empty database';
  end if;
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
  if exists(select 1 from pg_roles where rolname in ('anon','authenticated') and (rolsuper or rolbypassrls)) then
    raise exception 'API roles must not bypass RLS';
  end if;
end;
$test$;
create schema auth;
grant usage on schema public, auth to anon, authenticated;
create function auth.uid() returns uuid language sql stable as
  $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create table public.furniture(id uuid primary key, price numeric not null, is_deleted boolean default false);
create table public.orders(
  id uuid primary key default gen_random_uuid(), user_id uuid,
  total numeric not null check(total>0), status text default 'pending',
  address text, payment_method text not null
);
create table public.order_items(
  id uuid primary key default gen_random_uuid(), order_id uuid references public.orders(id) on delete cascade,
  furniture_id uuid references public.furniture(id), quantity integer not null check(quantity>0),
  price numeric not null check(price>0)
);
create table public.cart(
  id uuid primary key default gen_random_uuid(), user_id uuid,
  furniture_id uuid references public.furniture(id) on delete cascade,
  quantity integer not null check(quantity>0)
);
alter table public.furniture enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.cart enable row level security;
create policy active_furniture on public.furniture for select using(is_deleted=false);
create policy own_orders on public.orders for all to authenticated
  using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy own_lines on public.order_items for all to authenticated
  using(exists(select 1 from public.orders o where o.id=order_id and o.user_id=auth.uid()))
  with check(exists(select 1 from public.orders o where o.id=order_id and o.user_id=auth.uid()));
create policy own_cart on public.cart for all to authenticated
  using(user_id=auth.uid()) with check(user_id=auth.uid());
grant select on public.furniture to authenticated;
grant select,insert,update on public.orders to authenticated;
grant select,insert on public.order_items to authenticated;
grant select,insert,update,delete on public.cart to authenticated;

insert into public.furniture(id,price) values
  ('10000000-0000-0000-0000-000000000001',100),
  ('10000000-0000-0000-0000-000000000002',200);
insert into public.cart(id,user_id,furniture_id,quantity) values
  ('20000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001',1),
  ('20000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002',2),
  ('20000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001',3);

-- Inject exceptions and silent trigger/RLS skips at each write boundary.
create function public.checkout_fault() returns trigger language plpgsql set search_path='' as $$
declare mode text := current_setting('test.checkout_failure',true);
begin
  if mode=tg_table_name||'_raise' then raise exception 'Injected checkout write failure'; end if;
  if mode=tg_table_name||'_skip' then return null; end if;
  if tg_table_name='order_items' and mode='late_cart' then
    if new.furniture_id='10000000-0000-0000-0000-000000000001'::uuid then
      insert into public.cart(id,user_id,furniture_id,quantity)
      values('20000000-0000-0000-0000-000000000004',auth.uid(),new.furniture_id,1);
    end if;
  end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end;
$$;
create trigger checkout_order_fault before insert on public.orders for each row execute function public.checkout_fault();
create trigger checkout_line_fault before insert on public.order_items for each row execute function public.checkout_fault();
create trigger checkout_cart_fault before delete on public.cart for each row execute function public.checkout_fault();

savepoint negative_control;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
do $test$
declare order_id uuid;
begin
  insert into public.orders(user_id,total,status,address,payment_method)
  values(auth.uid(),500,'Pending','Test address','cod') returning id into order_id;
  begin
    insert into public.order_items(order_id,furniture_id,quantity,price)
    values(order_id,'10000000-0000-0000-0000-000000000001',1,0);
  exception when check_violation then null; end;
  delete from public.cart where user_id=auth.uid();
  if (select count(*) from public.orders)<>1 or exists(select 1 from public.order_items)
     or exists(select 1 from public.cart) then raise exception 'Negative control did not reproduce bug'; end if;
end;
$test$;
reset role;
rollback to negative_control;

\ir ../migrations/20261019030000_atomic_checkout.sql

-- The function cannot bypass RLS, and anonymous callers cannot execute it.
do $test$
begin
  if (select prosecdef from pg_proc where oid='public.checkout_cart(numeric,text,text)'::regprocedure)
     or not (select proconfig @> array['search_path=""'] from pg_proc where oid='public.checkout_cart(numeric,text,text)'::regprocedure)
     or has_function_privilege('anon','public.checkout_cart(numeric,text,text)','execute') then
    raise exception 'RPC privilege configuration is unsafe';
  end if;
end;
$test$;
set local role anon;
do $test$
begin
  begin
    perform public.checkout_cart(500,'Test','cod');
    raise exception 'Anonymous checkout allowed';
  exception when insufficient_privilege then null; end;
end;
$test$;
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','',true);
do $test$
begin
  begin
    perform public.checkout_cart(500,'Test','cod');
    raise exception 'Missing-identity checkout allowed';
  exception when insufficient_privilege then null; end;
end;
$test$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
do $test$
declare mode text; failed boolean;
begin
  foreach mode in array array['orders_raise','orders_skip','order_items_raise','order_items_skip','cart_raise','cart_skip'] loop
    perform set_config('test.checkout_failure',mode,true);
    failed := false;
    begin
      perform public.checkout_cart(500,'Test address','cod');
    exception when others then failed := true; end;
    if not failed then raise exception 'Expected % failure',mode; end if;
    if exists(select 1 from public.orders) or exists(select 1 from public.order_items)
       or (select count(*) from public.cart)<>2 then raise exception 'Partial write survived % failure',mode; end if;
  end loop;
  perform set_config('test.checkout_failure','',true);
  begin
    perform public.checkout_cart('NaN'::numeric,'Test','cod');
    raise exception 'Invalid total accepted';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.checkout_cart(500,'Test','invalid');
    raise exception 'Invalid method accepted';
  exception when invalid_parameter_value then null; end;
end;
$test$;
reset role;

-- A cart row hidden from DELETE by RLS must roll back the whole order.
create policy suppress_cart_delete on public.cart as restrictive for delete to authenticated using(false);
set local role authenticated;
do $test$
declare failed boolean := false;
begin
  begin perform public.checkout_cart(500,'Test','cod'); exception when others then failed:=true; end;
  if not failed or exists(select 1 from public.orders) or exists(select 1 from public.order_items)
     or (select count(*) from public.cart)<>2 then raise exception 'Denied deletion did not roll back'; end if;
end;
$test$;
reset role;
drop policy suppress_cart_delete on public.cart;

-- Missing/hidden furniture must not silently drop a cart line.
update public.furniture set is_deleted=true where id='10000000-0000-0000-0000-000000000002';
set local role authenticated;
do $test$
begin
  begin
    perform public.checkout_cart(500,'Test','cod');
    raise exception 'Unavailable furniture accepted';
  exception when invalid_parameter_value then null; end;
  if exists(select 1 from public.orders) or (select count(*) from public.cart)<>2 then
    raise exception 'Unavailable furniture changed checkout data';
  end if;
end;
$test$;
reset role;
update public.furniture set is_deleted=false;

set local role authenticated;
select set_config('test.checkout_failure','late_cart',true);
do $test$
declare saved_order_id uuid;
begin
  saved_order_id:=public.checkout_cart(500,'Test address','cod');
  if not exists(select 1 from public.orders o where o.id=saved_order_id and o.user_id=auth.uid() and total=500 and status='Pending')
     or (select count(*) from public.order_items i where i.order_id=saved_order_id)<>2
     or (select sum(quantity*price) from public.order_items i where i.order_id=saved_order_id)<>500
     or (select count(*) from public.cart)<>1
     or not exists(select 1 from public.cart where id='20000000-0000-0000-0000-000000000004') then
    raise exception 'Successful checkout lost lines, prices, or later cart addition';
  end if;
end;
$test$;
reset role;
select set_config('test.checkout_failure','',true);
delete from public.cart where id='20000000-0000-0000-0000-000000000004';
set local role authenticated;
do $test$
begin
  begin
    perform public.checkout_cart(500,'Test','cod');
    raise exception 'Empty cart accepted';
  exception when no_data_found then null; end;
  if (select count(*) from public.orders)<>1 then raise exception 'Repeat checkout created an order'; end if;
end;
$test$;
reset role;
do $test$
begin
  if (select count(*) from public.cart)<>1
     or not exists(select 1 from public.cart where user_id='00000000-0000-0000-0000-000000000002') then
    raise exception 'Another user cart was changed';
  end if;
end;
$test$;
rollback;
