-- psql -X --set ON_ERROR_STOP=1 --file supabase/tests/remaining_audit_repairs.sql
-- NEW EMPTY LOCAL ateliercarven_remaining_test database, or ephemeral PGlite.
-- Minimal compatible schema/owner RLS; not a full migration-history replay.
\set ON_ERROR_STOP on
begin;
do $test$
begin
  if (current_database() <> 'ateliercarven_remaining_test'
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
  address text, payment_method text not null, created_at timestamptz default now()
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


alter table public.furniture add column sale_price numeric, add column rating numeric, add column review_count integer;
alter table public.cart add column color text, add column material text;
update public.furniture set sale_price=80,rating=4.7,review_count=128 where id='10000000-0000-0000-0000-000000000001';
update public.furniture set sale_price=250,rating=4.9,review_count=342 where id='10000000-0000-0000-0000-000000000002';
update public.cart set color='Black',material='Wood' where user_id='00000000-0000-0000-0000-000000000001';
create table public.profiles(id uuid primary key,role text,username text);
insert into public.profiles values
 ('00000000-0000-0000-0000-000000000001','user','Owner A'),
 ('00000000-0000-0000-0000-000000000002','user','Owner B'),
 ('00000000-0000-0000-0000-000000000003','admin','Admin');
create schema private;
grant usage on schema private to authenticated;
create function private.is_admin() returns boolean language sql stable security definer set search_path='' as
 $$select exists(select 1 from public.profiles where id=auth.uid() and role='admin')$$;
alter table public.profiles enable row level security;
create policy own_or_admin_profile on public.profiles for select to authenticated using(id=auth.uid() or private.is_admin());
grant select on public.profiles to authenticated;
create table public.activity_logs(id uuid primary key default gen_random_uuid(),action text);
alter table public.activity_logs enable row level security;
create policy admin_logs on public.activity_logs for select to authenticated using(private.is_admin());
grant select on public.activity_logs to authenticated;
create policy admin_orders on public.orders for all to authenticated using(private.is_admin()) with check(private.is_admin());
create policy admin_line_reads on public.order_items for select to authenticated using(private.is_admin());
create policy admin_furniture on public.furniture for all to authenticated using(private.is_admin()) with check(private.is_admin());
create table public.reviews(
 id uuid primary key default gen_random_uuid(),furniture_id uuid not null references public.furniture(id),
 user_id uuid not null references public.profiles(id),rating smallint check(rating between 1 and 5),
 unique(user_id,furniture_id)
);
alter table public.reviews enable row level security;
create policy public_review_read on public.reviews for select using(true);
create policy own_review on public.reviews for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
grant select,insert,update,delete on public.reviews to authenticated;
insert into public.reviews(id,furniture_id,user_id,rating) values
 ('40000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001',4),
 ('40000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002',2);
create function public.recompute_furniture_rating() returns trigger language plpgsql as $$begin return null; end;$$;
create trigger reviews_recompute_trigger after insert or update or delete on public.reviews for each row execute function public.recompute_furniture_rating();

\ir ../migrations/20261019031255_remaining_audit_repairs.sql

do $test$
begin
 if not exists(select 1 from public.furniture where id='10000000-0000-0000-0000-000000000001' and rating=3 and review_count=2)
    or not exists(select 1 from public.furniture where id='10000000-0000-0000-0000-000000000002' and rating=0 and review_count=0) then
   raise exception 'Fixed aggregates were not rebuilt from reviews';
 end if;
 if has_function_privilege('anon','public.add_cart_item(uuid,integer,text,text)','execute')
    or has_function_privilege('anon','public.change_cart_quantity(uuid,integer)','execute')
    or has_function_privilege('anon','public.admin_dashboard_summary()','execute')
    or has_function_privilege('authenticated','public.recompute_furniture_rating()','execute')
    or exists(select 1 from pg_proc where oid in(
      'public.checkout_cart(numeric,text,text)'::regprocedure,'public.add_cart_item(uuid,integer,text,text)'::regprocedure,
      'public.change_cart_quantity(uuid,integer)'::regprocedure,'public.admin_dashboard_summary()'::regprocedure
    ) and (prosecdef or not (proconfig @> array['search_path=""']))) then raise exception 'Unsafe RPC privileges'; end if;
end;
$test$;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
do $test$
declare failure_mode text; failed boolean; saved_order uuid;
begin
 -- Expected total cannot override the server's sale-price snapshot.
 begin perform public.checkout_cart(1,'Test','cod'); raise exception 'Tampered total accepted';
 exception when invalid_parameter_value then null; end;
 begin perform public.checkout_cart(500,'Test','cod'); raise exception 'Stale total accepted';
 exception when invalid_parameter_value then null; end;
 if exists(select 1 from public.orders) or (select count(*) from public.cart)<>2 then raise exception 'Mismatch changed data'; end if;
 foreach failure_mode in array array['orders_raise','orders_skip','order_items_raise','order_items_skip','cart_raise','cart_skip'] loop
  perform set_config('test.checkout_failure',failure_mode,true);
  failed:=false;
  begin perform public.checkout_cart(480,'Test','cod'); exception when others then failed:=true; end;
  if not failed or exists(select 1 from public.orders) or exists(select 1 from public.order_items)
     or (select count(*) from public.cart)<>2 then raise exception 'Rollback failed at %',failure_mode; end if;
 end loop;
 perform set_config('test.checkout_failure','',true);
 saved_order:=public.checkout_cart(480,'Test','cod');
 if not exists(select 1 from public.orders where id=saved_order and total=480)
    or (select sum(price*quantity) from public.order_items where order_id=saved_order)<>480
    or (select count(*) from public.order_items where order_id=saved_order and color='Black' and material='Wood')<>2
    or not exists(select 1 from public.order_items where order_id=saved_order and furniture_id='10000000-0000-0000-0000-000000000001' and price=80)
    or exists(select 1 from public.cart) then raise exception 'Effective-price/variant snapshot incorrect'; end if;
 begin perform public.admin_dashboard_summary(); raise exception 'Non-admin summary allowed';
 exception when insufficient_privilege then null; end;
end;
$test$;
-- Even a direct UPDATE permitted by a legacy grant cannot rewrite variants.
reset role;
grant update on public.order_items to authenticated;
set local role authenticated;
do $test$
begin
 begin
  update public.order_items set color='Changed' where color='Black';
  raise exception 'Variant snapshot update accepted';
 exception when check_violation then null; end;
 if (select count(*) from public.order_items where color='Black' and material='Wood')<>2 then
  raise exception 'Variant snapshot changed'; end if;
end;
$test$;
-- Atomic additions distinguish variants and accumulate quantities.
do $test$
declare first_item uuid; same_item uuid; other_item uuid; result_quantity integer;
begin
 first_item:=public.add_cart_item('10000000-0000-0000-0000-000000000001',2,'Black','Wood');
 same_item:=public.add_cart_item('10000000-0000-0000-0000-000000000001',3,'Black','Wood');
 other_item:=public.add_cart_item('10000000-0000-0000-0000-000000000001',1,'White','Wood');
 if first_item<>same_item or other_item=first_item
    or not exists(select 1 from public.cart where id=first_item and quantity=5) then raise exception 'Atomic addition incorrect'; end if;
 perform public.change_cart_quantity(first_item,1);
 perform public.change_cart_quantity(first_item,1);
 result_quantity:=public.change_cart_quantity(first_item,-1);
 if result_quantity<>6 then raise exception 'Delta updates lost increments'; end if;
 result_quantity:=public.change_cart_quantity(other_item,-1);
 if result_quantity<>0 or exists(select 1 from public.cart where id=other_item) then
  raise exception 'Decrement to zero did not remove row'; end if;
 begin perform public.change_cart_quantity('20000000-0000-0000-0000-000000000003',1); raise exception 'Cross-user cart write allowed';
 exception when no_data_found then null; end;
 begin perform public.change_cart_quantity(first_item,99); raise exception 'Invalid delta allowed';
 exception when invalid_parameter_value then null; end;
 begin perform public.add_cart_item('10000000-0000-0000-0000-000000000001',0); raise exception 'Invalid add quantity allowed';
 exception when invalid_parameter_value then null; end;
end;
$test$;
reset role;
do $test$
begin
 if not exists(select 1 from public.cart where id='20000000-0000-0000-0000-000000000003' and quantity=3) then
  raise exception 'Other user cart changed'; end if;
end;
$test$;
-- Moving a review recomputes both parents under deterministic row locks.
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
update public.reviews set furniture_id='10000000-0000-0000-0000-000000000002' where id='40000000-0000-0000-0000-000000000002';
do $test$
begin
 if not exists(select 1 from public.furniture where id='10000000-0000-0000-0000-000000000001' and rating=4 and review_count=1)
 or not exists(select 1 from public.furniture where id='10000000-0000-0000-0000-000000000002' and rating=2 and review_count=1) then
  raise exception 'Moved review aggregates stale'; end if;
end;
$test$;
update public.reviews set rating=5 where id='40000000-0000-0000-0000-000000000002';
delete from public.reviews where id='40000000-0000-0000-0000-000000000002';
do $test$
begin
 if not exists(select 1 from public.furniture where id='10000000-0000-0000-0000-000000000002' and rating=0 and review_count=0) then
  raise exception 'Deleted review aggregates stale'; end if;
end;
$test$;
reset role;
-- More rows than the default API cap: aggregate inside SQL, never client pages.
insert into public.orders(user_id,total,status,payment_method)
select '00000000-0000-0000-0000-000000000003',3.25,'Completed','cod' from generate_series(1,1205);
insert into public.orders(user_id,total,status,payment_method)
values('00000000-0000-0000-0000-000000000003',999,'cancelled','cod');
insert into public.activity_logs(action) select 'Fixture' from generate_series(1,1205);
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
do $test$
declare summary jsonb;
begin
 summary:=public.admin_dashboard_summary();
 if (summary->>'orders')::integer<>1206 or (summary->>'revenue')::numeric<>4396.25
    or (summary->>'logs')::integer<>1205 or (summary->>'users')::integer<>2
    or (summary->>'pending')::integer<>1 then raise exception 'Dashboard aggregate truncated/incorrect: %',summary; end if;
end;
$test$;
select set_config('request.jwt.claim.sub','',true);
do $test$
begin
 begin perform public.add_cart_item('10000000-0000-0000-0000-000000000001',1); raise exception 'Missing identity accepted';
 exception when insufficient_privilege then null; end;
end;
$test$;
reset role;

-- Reproduce the inspected legacy grants, including explicit column UPDATE.
grant all on public.profiles, public.orders, public.order_items to anon, authenticated;
grant update (price) on public.order_items to authenticated;
savepoint vulnerable_lines;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
update public.order_items set price=1,quantity=99;
do $test$
begin
 if not exists(select 1 from public.order_items where price=1 and quantity=99) then
  raise exception 'Negative control did not reproduce financial mutation'; end if;
end;
$test$;
delete from public.order_items;
do $test$
begin
 if exists(select 1 from public.order_items) then raise exception 'Negative control did not delete owned lines'; end if;
end;
$test$;
rollback to savepoint vulnerable_lines;
savepoint vulnerable_parent;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
delete from public.orders;
do $test$
begin
 if exists(select 1 from public.order_items) then raise exception 'Negative control did not cascade'; end if;
end;
$test$;
rollback to savepoint vulnerable_parent;

\ir ../migrations/20261019045409_lock_purchased_order_items.sql

-- Check effective privileges, including inherited PUBLIC/column grants.
do $test$
declare api_role text; relation_name text; column_name text;
begin
 foreach api_role in array array['anon','authenticated'] loop
  foreach relation_name in array array['profiles','orders','order_items'] loop
   if has_table_privilege(api_role,'public.'||relation_name,'TRUNCATE') then
    raise exception 'TRUNCATE retained for % on %',api_role,relation_name; end if;
  end loop;
  if has_table_privilege(api_role,'public.order_items','UPDATE')
     or has_table_privilege(api_role,'public.order_items','DELETE')
     or has_table_privilege(api_role,'public.orders','DELETE') then
   raise exception 'Purchased-line mutation privilege retained for %',api_role; end if;
  foreach column_name in array array['id','order_id','furniture_id','quantity','price','color','material'] loop
   if has_column_privilege(api_role,'public.order_items',column_name,'UPDATE') then
    raise exception 'Column UPDATE retained for % on %',api_role,column_name; end if;
  end loop;
 end loop;
end;
$test$;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
do $test$
declare relation_name text; saved_order uuid;
begin
 if (select count(*) from public.order_items)<>2 then raise exception 'Owner read changed'; end if;
 begin update public.order_items set price=1; raise exception 'Price update allowed';
 exception when insufficient_privilege then null; end;
 begin update public.order_items set quantity=99; raise exception 'Quantity update allowed';
 exception when insufficient_privilege then null; end;
 begin update public.order_items set order_id=gen_random_uuid(); raise exception 'Reparent allowed';
 exception when insufficient_privilege then null; end;
 begin delete from public.order_items; raise exception 'Line delete allowed';
 exception when insufficient_privilege then null; end;
 begin delete from public.orders; raise exception 'Parent cascade allowed';
 exception when insufficient_privilege then null; end;
 foreach relation_name in array array['profiles','orders','order_items'] loop
  begin execute format('truncate public.%I cascade',relation_name); raise exception 'TRUNCATE allowed';
  exception when insufficient_privilege then null; end;
 end loop;
 -- A real invoker checkout must still save its complete snapshot and clear cart.
 perform public.add_cart_item('10000000-0000-0000-0000-000000000001',1,'Black','Wood');
 -- The earlier cart-delta test left six items of this same variant.
 saved_order:=public.checkout_cart(560,'Fixture address','cod');
 if not exists(select 1 from public.order_items where order_id=saved_order and quantity=7 and price=80)
    or exists(select 1 from public.cart) then raise exception 'Checkout broken by revokes'; end if;
end;
$test$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
do $test$
begin
 if exists(select 1 from public.order_items) then raise exception 'Other-owner lines visible'; end if;
end;
$test$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
do $test$
begin
 if (select count(*) from public.order_items)<>3 then raise exception 'Admin line reads changed'; end if;
 update public.orders set status='Completed' where user_id='00000000-0000-0000-0000-000000000001';
 if not found then raise exception 'Admin status update blocked'; end if;
end;
$test$;
reset role;
set local role anon;
do $test$
begin
 begin delete from public.order_items; raise exception 'Anonymous line delete allowed';
 exception when insufficient_privilege then null; end;
 begin truncate public.order_items; raise exception 'Anonymous TRUNCATE allowed';
 exception when insufficient_privilege then null; end;
end;
$test$;
reset role;

-- Direct creation/append is still possible before the creation-boundary repair.
grant insert (status) on public.orders to authenticated;
grant insert (price) on public.order_items to authenticated;
savepoint vulnerable_creation;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
do $test$
declare forged_order uuid; existing_order uuid;
begin
 insert into public.orders(user_id,total,status,payment_method)
 values(auth.uid(),0.01,'Completed','cod') returning id into forged_order;
 insert into public.order_items(order_id,furniture_id,quantity,price)
 values(forged_order,'10000000-0000-0000-0000-000000000001',999,0.01);
 select id into existing_order from public.orders where user_id=auth.uid() and id<>forged_order limit 1;
 insert into public.order_items(order_id,furniture_id,quantity,price)
 values(existing_order,'10000000-0000-0000-0000-000000000001',999,0.01);
 if (select count(*) from public.order_items where price=0.01)<>2 then
  raise exception 'Negative control did not reproduce creation/append bypass'; end if;
end;
$test$;
rollback to savepoint vulnerable_creation;

-- Mirror the existing live status/total guard for compatibility checks.
create function public.protect_order_admin_fields() returns trigger language plpgsql
security definer set search_path='' as $$
begin
 if (new.status is distinct from old.status or new.total is distinct from old.total)
    and not private.is_admin() then raise exception 'Only admins can change order status or total.'; end if;
 return new;
end;
$$;
create trigger trg_protect_order_admin_fields before update on public.orders
for each row execute function public.protect_order_admin_fields();

\ir ../migrations/20261019050158_secure_checkout_creation.sql

do $test$
declare api_role text; relation_name text;
begin
 foreach api_role in array array['anon','authenticated'] loop
  foreach relation_name in array array['orders','order_items'] loop
   if has_table_privilege(api_role,'public.'||relation_name,'INSERT')
      or has_any_column_privilege(api_role,'public.'||relation_name,'INSERT') then
    raise exception 'Direct creation privilege retained for % on %',api_role,relation_name; end if;
  end loop;
 end loop;
 if has_function_privilege('anon','public.checkout_cart(numeric,text,text)','EXECUTE')
    or not has_function_privilege('authenticated','public.checkout_cart(numeric,text,text)','EXECUTE')
    or not exists(select 1 from pg_proc where oid='public.checkout_cart(numeric,text,text)'::regprocedure
       and prosecdef and pg_get_userbyid(proowner)='postgres' and proconfig @> array['search_path=""']) then
  raise exception 'Creation boundary execution configuration incorrect'; end if;
end;
$test$;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
do $test$
declare owned_order uuid; saved_order uuid; failure_mode text; failed boolean;
begin
 select id into owned_order from public.orders where user_id=auth.uid() limit 1;
 begin
  insert into public.orders(user_id,total,status,payment_method) values(auth.uid(),0.01,'Completed','cod');
  raise exception 'Direct forged order accepted';
 exception when insufficient_privilege then null; end;
 begin
  insert into public.order_items(order_id,furniture_id,quantity,price)
  values(owned_order,'10000000-0000-0000-0000-000000000001',999,0.01);
  raise exception 'Append to purchased order accepted';
 exception when insufficient_privilege then null; end;
 perform public.add_cart_item('10000000-0000-0000-0000-000000000001',2,'White','Wood');
 perform public.add_cart_item('10000000-0000-0000-0000-000000000002',1,'Black','Metal');
 begin perform public.checkout_cart(1,'Fixture','cod'); raise exception 'Forged total accepted';
 exception when invalid_parameter_value then null; end;
 begin perform public.checkout_cart(400,'Fixture','cod'); raise exception 'Stale total accepted';
 exception when invalid_parameter_value then null; end;
 begin perform public.checkout_cart(360,'Fixture','unknown'); raise exception 'Invalid method accepted';
 exception when invalid_parameter_value then null; end;
 foreach failure_mode in array array['orders_raise','orders_skip','order_items_raise','order_items_skip','cart_raise','cart_skip'] loop
  perform set_config('test.checkout_failure',failure_mode,true);
  failed:=false;
  begin perform public.checkout_cart(360,'Fixture','cod'); exception when others then failed:=true; end;
  if not failed or (select count(*) from public.orders)<>2
     or (select count(*) from public.order_items)<>3 or (select count(*) from public.cart)<>2 then
   raise exception 'Definer checkout rollback failed at %',failure_mode; end if;
 end loop;
 perform set_config('test.checkout_failure','',true);
 saved_order:=public.checkout_cart(360,'Fixture address','cod');
 if not exists(select 1 from public.orders where id=saved_order and user_id=auth.uid() and status='Pending' and total=360)
    or (select sum(quantity*price) from public.order_items where order_id=saved_order)<>360
    or not exists(select 1 from public.order_items where order_id=saved_order and quantity=2 and price=80 and color='White' and material='Wood')
    or not exists(select 1 from public.order_items where order_id=saved_order and quantity=1 and price=200 and color='Black' and material='Metal')
    or exists(select 1 from public.cart) then raise exception 'Definer checkout snapshot/cleanup incorrect'; end if;
 begin perform public.checkout_cart(360,'Fixture','cod'); raise exception 'Repeat checkout accepted';
 exception when no_data_found then null; end;
 begin
  update public.orders set status='Completed' where id=saved_order;
  raise exception 'Owner status update accepted';
 exception when raise_exception then
  if sqlerrm<>'Only admins can change order status or total.' then raise; end if;
 end;
end;
$test$;
reset role;
do $test$
begin
 if not exists(select 1 from public.cart where user_id='00000000-0000-0000-0000-000000000002' and quantity=3)
    or exists(select 1 from public.orders where user_id='00000000-0000-0000-0000-000000000002') then
  raise exception 'Other-owner state changed'; end if;
end;
$test$;
-- Definer bypass must explicitly reject a soft-deleted catalog item.
savepoint unavailable_catalog;
update public.furniture set is_deleted=true where id='10000000-0000-0000-0000-000000000002';
insert into public.cart(user_id,furniture_id,quantity)
values('00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002',1);
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
do $test$
begin
 begin perform public.checkout_cart(200,'Fixture','cod'); raise exception 'Deleted product accepted';
 exception when invalid_parameter_value then null; end;
 if (select count(*) from public.cart)<>1 or (select count(*) from public.orders)<>3 then
  raise exception 'Unavailable product changed data'; end if;
end;
$test$;
rollback to savepoint unavailable_catalog;
set local role authenticated;
select set_config('request.jwt.claim.sub','',true);
do $test$
begin
 begin perform public.checkout_cart(240,'Fixture','cod'); raise exception 'Missing identity accepted';
 exception when insufficient_privilege then null; end;
end;
$test$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
do $test$
declare saved_order uuid;
begin
 if exists(select 1 from public.order_items) then raise exception 'Owner A lines visible to B'; end if;
 saved_order:=public.checkout_cart(240,'Owner B address','cod');
 if (select count(*) from public.orders)<>1
    or not exists(select 1 from public.order_items where order_id=saved_order and quantity=3 and price=80)
    or exists(select 1 from public.cart) then raise exception 'Owner B checkout incorrectly scoped'; end if;
end;
$test$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
do $test$
begin
 if (select count(*) from public.order_items)<>6 then raise exception 'Admin line reads broken'; end if;
 update public.orders set status='Processing' where user_id='00000000-0000-0000-0000-000000000001';
 if not found then raise exception 'Admin status update broken'; end if;
 begin
  insert into public.orders(user_id,total,payment_method) values(auth.uid(),1,'cod');
  raise exception 'Admin API direct creation allowed';
 exception when insufficient_privilege then null; end;
end;
$test$;
reset role;
set local role anon;
do $test$
begin
 begin perform public.checkout_cart(240,'Fixture','cod'); raise exception 'Anonymous checkout allowed';
 exception when insufficient_privilege then null; end;
 begin insert into public.orders(user_id,total,payment_method) values(null,1,'cod'); raise exception 'Anonymous direct order allowed';
 exception when insufficient_privilege then null; end;
end;
$test$;
reset role;
rollback;
