-- Remove open MVP access; everything becomes per-user.
do $$ declare t text; begin
  foreach t in array array['ingredients','ingredient_price_history','recipes','recipe_ingredients','menu_prices','expenses','pricing_settings'] loop
    execute format('drop policy if exists "MVP open access" on public.%I', t);
    execute format('revoke all on public.%I from anon', t);
  end loop;
end $$;

comment on table public.ingredients is 'Per-user ingredient master. Rows with owner_id NULL are legacy demo rows from the open MVP and are invisible to all users.';

alter table public.ingredients alter column owner_id set default auth.uid();
alter table public.recipes alter column owner_id set default auth.uid();
alter table public.expenses alter column owner_id set default auth.uid();
alter table public.pricing_settings alter column owner_id set default auth.uid();

alter table public.ingredients add column if not exists is_sample boolean not null default false;
alter table public.recipes add column if not exists is_sample boolean not null default false;

-- expenses: unique per user instead of globally
alter table public.expenses drop constraint if exists expenses_key_key;
create unique index if not exists expenses_owner_key_uniq on public.expenses(owner_id, key);

-- pricing_settings: one row per user instead of a global singleton
alter table public.pricing_settings drop constraint if exists pricing_settings_id_check;
create sequence if not exists public.pricing_settings_id_seq start 2 owned by public.pricing_settings.id;
alter table public.pricing_settings alter column id set default nextval('public.pricing_settings_id_seq');
grant usage on sequence public.pricing_settings_id_seq to authenticated, service_role;
create unique index if not exists pricing_settings_owner_uniq on public.pricing_settings(owner_id);

create unique index if not exists ingredients_owner_name_uniq on public.ingredients(owner_id, lower(name));
create index if not exists recipe_ingredients_recipe_idx on public.recipe_ingredients(recipe_id);
create index if not exists recipe_ingredients_ingredient_idx on public.recipe_ingredients(ingredient_id);
create index if not exists price_history_ing_idx on public.ingredient_price_history(ingredient_id, recorded_at desc);
create index if not exists menu_prices_recipe_idx on public.menu_prices(recipe_id, effective_from desc);

-- Business plan for break-even & investment module
create table public.business_plans (
  owner_id uuid primary key default auth.uid(),
  initial_investment numeric not null default 0 check (initial_investment >= 0),
  target_monthly_profit numeric not null default 0 check (target_monthly_profit >= 0),
  operating_days_per_month integer not null default 26 check (operating_days_per_month between 1 and 31),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.business_plans to authenticated;
grant all on public.business_plans to service_role;
alter table public.business_plans enable row level security;
create policy "own plan" on public.business_plans for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Owner policies
create policy "own rows" on public.ingredients for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "own rows" on public.recipes for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "own rows" on public.expenses for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "own rows" on public.pricing_settings for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "own via ingredient" on public.ingredient_price_history for all to authenticated
  using (exists (select 1 from public.ingredients i where i.id = ingredient_id and i.owner_id = auth.uid()))
  with check (exists (select 1 from public.ingredients i where i.id = ingredient_id and i.owner_id = auth.uid()));
create policy "own via recipe" on public.menu_prices for all to authenticated
  using (exists (select 1 from public.recipes r where r.id = recipe_id and r.owner_id = auth.uid()))
  with check (exists (select 1 from public.recipes r where r.id = recipe_id and r.owner_id = auth.uid()));
create policy "own via recipe and ingredient" on public.recipe_ingredients for all to authenticated
  using (exists (select 1 from public.recipes r where r.id = recipe_id and r.owner_id = auth.uid()))
  with check (
    exists (select 1 from public.recipes r where r.id = recipe_id and r.owner_id = auth.uid())
    and exists (select 1 from public.ingredients i where i.id = ingredient_id and i.owner_id = auth.uid())
  );

-- History is recorded by triggers so it can never drift from the live value.
create or replace function public.log_ingredient_price() returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' or new.purchase_price is distinct from old.purchase_price or new.purchase_qty is distinct from old.purchase_qty
     or new.purchase_unit is distinct from old.purchase_unit or new.yield_pct is distinct from old.yield_pct then
    insert into public.ingredient_price_history (ingredient_id, purchase_unit, purchase_qty, purchase_price, yield_pct)
    values (new.id, new.purchase_unit, new.purchase_qty, new.purchase_price, new.yield_pct);
  end if;
  return new;
end $$;
create trigger ingredients_price_history after insert or update on public.ingredients
  for each row execute function public.log_ingredient_price();

create or replace function public.log_menu_price() returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' or new.selling_price is distinct from old.selling_price then
    insert into public.menu_prices (recipe_id, price) values (new.id, new.selling_price);
  end if;
  return new;
end $$;
create trigger recipes_menu_price after insert or update on public.recipes
  for each row execute function public.log_menu_price();

create or replace function public.touch_updated_at() returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;
create trigger ingredients_touch before update on public.ingredients for each row execute function public.touch_updated_at();
create trigger recipes_touch before update on public.recipes for each row execute function public.touch_updated_at();

-- Atomic recipe save (header + lines in one transaction). Runs as the caller, so RLS applies.
create or replace function public.save_recipe(p_id uuid, p_recipe jsonb, p_lines jsonb)
returns uuid language plpgsql security invoker set search_path = public as $$
declare rid uuid;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if p_id is null then
    insert into public.recipes (name, category, batch_portions, portion_note, wastage_pct, packaging_cost, fuel_cost, selling_price, monthly_portions)
    values (p_recipe->>'name', coalesce(p_recipe->>'category','Main'), (p_recipe->>'batch_portions')::numeric, nullif(p_recipe->>'portion_note',''),
      (p_recipe->>'wastage_pct')::numeric, (p_recipe->>'packaging_cost')::numeric, (p_recipe->>'fuel_cost')::numeric,
      (p_recipe->>'selling_price')::numeric, (p_recipe->>'monthly_portions')::numeric)
    returning id into rid;
  else
    update public.recipes set name = p_recipe->>'name', category = coalesce(p_recipe->>'category','Main'),
      batch_portions = (p_recipe->>'batch_portions')::numeric, portion_note = nullif(p_recipe->>'portion_note',''),
      wastage_pct = (p_recipe->>'wastage_pct')::numeric, packaging_cost = (p_recipe->>'packaging_cost')::numeric,
      fuel_cost = (p_recipe->>'fuel_cost')::numeric, selling_price = (p_recipe->>'selling_price')::numeric,
      monthly_portions = (p_recipe->>'monthly_portions')::numeric
    where id = p_id returning id into rid;
    if rid is null then raise exception 'Recipe not found'; end if;
    delete from public.recipe_ingredients where recipe_id = rid;
  end if;
  insert into public.recipe_ingredients (recipe_id, ingredient_id, quantity, unit, sort_order)
  select rid, (l->>'ingredient_id')::uuid, (l->>'quantity')::numeric, l->>'unit', (ord - 1)::int
  from jsonb_array_elements(coalesce(p_lines,'[]'::jsonb)) with ordinality as t(l, ord);
  return rid;
end $$;
revoke all on function public.save_recipe(uuid, jsonb, jsonb) from public, anon;
grant execute on function public.save_recipe(uuid, jsonb, jsonb) to authenticated;

-- Create a user's empty workspace (zero expenses, default settings, plan). Idempotent.
create or replace function public.init_workspace() returns void language plpgsql security invoker set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  insert into public.expenses (key, label, monthly_amount, sort_order) values
    ('rent','Rent',0,1),('salaries','Salaries',0,2),('electricity','Electricity',0,3),('gas','Gas / Fuel',0,4),
    ('water','Water',0,5),('maintenance','Maintenance',0,6),('cleaning','Cleaning',0,7),('marketing','Marketing',0,8),('other','Other expenses',0,9)
  on conflict (owner_id, key) do nothing;
  insert into public.pricing_settings (target_margin_pct) values (30) on conflict (owner_id) do nothing;
  insert into public.business_plans (initial_investment) values (0) on conflict (owner_id) do nothing;
end $$;
revoke all on function public.init_workspace() from public, anon;
grant execute on function public.init_workspace() to authenticated;

-- Load clearly-labelled SAMPLE data for the caller. All names end with "(sample)".
create or replace function public.load_sample_data() returns void language plpgsql security invoker set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Not signed in'; end if;
  perform public.init_workspace();
  if exists (select 1 from public.ingredients where owner_id = uid and is_sample) then return; end if;
  update public.expenses e set monthly_amount = v.amt from (values
    ('rent',60000),('salaries',180000),('electricity',25000),('gas',30000),('water',3000),('maintenance',5000),('cleaning',4000),('marketing',8000),('other',6000)) v(k, amt)
  where e.owner_id = uid and e.key = v.k and e.monthly_amount = 0;
  update public.pricing_settings set expected_monthly_portions = 3400, expected_monthly_sales = 640000
    where owner_id = uid and expected_monthly_portions = 0 and expected_monthly_sales = 0;
  update public.business_plans set initial_investment = 1500000, target_monthly_profit = 100000
    where owner_id = uid and initial_investment = 0 and target_monthly_profit = 0;

  insert into public.ingredients (name, category, purchase_unit, purchase_qty, purchase_price, yield_pct, is_sample)
  select n || ' (sample)', c, u, q, p, y, true from (values
    ('Mutton (bone-in)','Meat','kg',1,850,92),('Mutton trotters (paaya)','Meat','kg',1,380,70),('Mutton botti (tripe)','Meat','kg',1,300,65),
    ('Basmati rice','Grains','kg',1,140,100),('Maida','Grains','kg',1,45,100),('Onion','Vegetables','kg',1,35,90),('Tomato','Vegetables','kg',1,30,95),
    ('Green chilli','Vegetables','kg',1,60,92),('Coriander leaves','Herbs','kg',1,80,60),('Mint leaves','Herbs','kg',1,100,50),
    ('Ginger garlic paste','Spices','kg',1,180,100),('Coconut','Vegetables','piece',1,35,80),('Chilli powder','Spices','kg',1,320,100),
    ('Turmeric powder','Spices','kg',1,250,100),('Garam masala','Spices','kg',1,800,100),('Black pepper','Spices','kg',1,700,100),
    ('Fennel seeds','Spices','kg',1,300,100),('Salt','Spices','kg',1,25,100),('Sugar','Grains','kg',1,45,100),('Sunflower oil','Oils','litre',1,140,100),
    ('Ghee','Dairy','litre',1,650,100),('Curd','Dairy','kg',1,70,100),('Milk','Dairy','litre',1,56,100),('Eggs','Dairy','piece',30,180,100)
  ) v(n, c, u, q, p, y)
  on conflict do nothing;

  insert into public.recipes (name, category, batch_portions, portion_note, wastage_pct, packaging_cost, fuel_cost, selling_price, monthly_portions, is_sample)
  select n || ' (sample)', c, b, pn, w, pk, f, sp, mp, true from (values
    ('Mutton Kaal Paaya','Soups & Gravies',10,'1 bowl (~300 ml)',3,8,6,220,600),
    ('Mutton Botti','Starters',8,'1 plate (~150 g)',3,8,5,160,400),
    ('Fried Parotta','Breads',10,'2 pieces per plate',2,4,3,60,1500),
    ('Mutton Biryani','Biryani',10,'1 plate (~450 g)',4,15,10,260,900)
  ) v(n, c, b, pn, w, pk, f, sp, mp);

  insert into public.recipe_ingredients (recipe_id, ingredient_id, quantity, unit, sort_order)
  select r.id, i.id, l.qty, l.unit, l.ord
  from (values
    ('Mutton Kaal Paaya','Mutton trotters (paaya)',1.5,'kg',1),('Mutton Kaal Paaya','Onion',500,'g',2),('Mutton Kaal Paaya','Tomato',400,'g',3),
    ('Mutton Kaal Paaya','Ginger garlic paste',150,'g',4),('Mutton Kaal Paaya','Coconut',2,'piece',5),('Mutton Kaal Paaya','Black pepper',30,'g',6),
    ('Mutton Kaal Paaya','Fennel seeds',20,'g',7),('Mutton Kaal Paaya','Turmeric powder',10,'g',8),('Mutton Kaal Paaya','Chilli powder',30,'g',9),
    ('Mutton Kaal Paaya','Sunflower oil',150,'ml',10),('Mutton Kaal Paaya','Coriander leaves',50,'g',11),('Mutton Kaal Paaya','Salt',40,'g',12),
    ('Mutton Botti','Mutton botti (tripe)',1.5,'kg',1),('Mutton Botti','Onion',400,'g',2),('Mutton Botti','Ginger garlic paste',100,'g',3),
    ('Mutton Botti','Chilli powder',40,'g',4),('Mutton Botti','Turmeric powder',10,'g',5),('Mutton Botti','Garam masala',15,'g',6),
    ('Mutton Botti','Black pepper',15,'g',7),('Mutton Botti','Sunflower oil',150,'ml',8),('Mutton Botti','Coriander leaves',40,'g',9),('Mutton Botti','Salt',30,'g',10),
    ('Fried Parotta','Maida',1,'kg',1),('Fried Parotta','Sunflower oil',300,'ml',2),('Fried Parotta','Eggs',2,'piece',3),
    ('Fried Parotta','Sugar',20,'g',4),('Fried Parotta','Milk',100,'ml',5),('Fried Parotta','Salt',15,'g',6),
    ('Mutton Biryani','Basmati rice',1.5,'kg',1),('Mutton Biryani','Mutton (bone-in)',1.5,'kg',2),('Mutton Biryani','Onion',1,'kg',3),
    ('Mutton Biryani','Tomato',400,'g',4),('Mutton Biryani','Curd',300,'g',5),('Mutton Biryani','Ginger garlic paste',150,'g',6),
    ('Mutton Biryani','Ghee',150,'ml',7),('Mutton Biryani','Sunflower oil',150,'ml',8),('Mutton Biryani','Mint leaves',50,'g',9),
    ('Mutton Biryani','Coriander leaves',50,'g',10),('Mutton Biryani','Chilli powder',30,'g',11),('Mutton Biryani','Garam masala',20,'g',12),
    ('Mutton Biryani','Turmeric powder',5,'g',13),('Mutton Biryani','Salt',50,'g',14),('Mutton Biryani','Green chilli',50,'g',15)
  ) l(rname, iname, qty, unit, ord)
  join public.recipes r on r.owner_id = uid and r.is_sample and r.name = l.rname || ' (sample)'
  join public.ingredients i on i.owner_id = uid and i.is_sample and i.name = l.iname || ' (sample)';
end $$;
revoke all on function public.load_sample_data() from public, anon;
grant execute on function public.load_sample_data() to authenticated;

-- Remove all sample-marked rows for the caller (real data untouched).
create or replace function public.clear_sample_data() returns void language plpgsql security invoker set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  delete from public.recipes where owner_id = auth.uid() and is_sample;
  delete from public.ingredients i where i.owner_id = auth.uid() and i.is_sample
    and not exists (select 1 from public.recipe_ingredients ri where ri.ingredient_id = i.id);
end $$;
revoke all on function public.clear_sample_data() from public, anon;
grant execute on function public.clear_sample_data() to authenticated;

revoke execute on function public.log_ingredient_price() from public, anon;
revoke execute on function public.log_menu_price() from public, anon;
revoke execute on function public.touch_updated_at() from public, anon;