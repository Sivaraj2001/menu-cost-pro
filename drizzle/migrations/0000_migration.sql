
create table public.ingredients (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid,
  name text not null,
  category text not null default 'General',
  purchase_unit text not null check (purchase_unit in ('kg','g','litre','ml','piece','packet')),
  purchase_qty numeric not null check (purchase_qty > 0),
  purchase_price numeric not null check (purchase_price >= 0),
  yield_pct numeric not null default 100 check (yield_pct > 0 and yield_pct <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.ingredient_price_history (
  id uuid primary key default gen_random_uuid(),
  ingredient_id uuid not null references public.ingredients(id) on delete cascade,
  purchase_unit text not null,
  purchase_qty numeric not null,
  purchase_price numeric not null,
  yield_pct numeric not null,
  recorded_at timestamptz not null default now()
);
create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid,
  name text not null,
  category text not null default 'Main',
  batch_portions numeric not null default 1 check (batch_portions > 0),
  portion_note text,
  wastage_pct numeric not null default 0 check (wastage_pct >= 0 and wastage_pct < 100),
  packaging_cost numeric not null default 0 check (packaging_cost >= 0),
  fuel_cost numeric not null default 0 check (fuel_cost >= 0),
  selling_price numeric not null default 0 check (selling_price >= 0),
  monthly_portions numeric not null default 0 check (monthly_portions >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  ingredient_id uuid not null references public.ingredients(id) on delete restrict,
  quantity numeric not null check (quantity > 0),
  unit text not null check (unit in ('kg','g','litre','ml','piece','packet')),
  sort_order int not null default 0
);
create table public.menu_prices (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  price numeric not null,
  effective_from timestamptz not null default now()
);
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid,
  key text not null unique,
  label text not null,
  monthly_amount numeric not null default 0 check (monthly_amount >= 0),
  sort_order int not null default 0
);
create table public.pricing_settings (
  id int primary key default 1 check (id = 1),
  owner_id uuid,
  target_margin_pct numeric not null default 30 check (target_margin_pct >= 0 and target_margin_pct < 95),
  rounding_increment numeric not null default 5 check (rounding_increment in (1,5,10)),
  overhead_method text not null default 'per_portion' check (overhead_method in ('per_portion','percent_of_sales')),
  expected_monthly_portions numeric not null default 0,
  expected_monthly_sales numeric not null default 0,
  fuel_allocated_per_recipe boolean not null default true,
  electricity_allocated_per_recipe boolean not null default false,
  review_threshold_pct numeric not null default 0,
  updated_at timestamptz not null default now()
);

do $$ declare t text; begin
  foreach t in array array['ingredients','ingredient_price_history','recipes','recipe_ingredients','menu_prices','expenses','pricing_settings'] loop
    execute format('grant select, insert, update, delete on public.%I to anon, authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "MVP open access" on public.%I for all to anon, authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- Seed
insert into public.pricing_settings (id, target_margin_pct, rounding_increment, overhead_method, expected_monthly_portions, expected_monthly_sales, fuel_allocated_per_recipe, electricity_allocated_per_recipe)
values (1, 30, 5, 'per_portion', 6000, 1050000, true, false);

insert into public.expenses (key, label, monthly_amount, sort_order) values
('rent','Rent',60000,1),('salaries','Salaries',180000,2),('electricity','Electricity',25000,3),
('gas','Gas / Fuel',30000,4),('water','Water',3000,5),('maintenance','Maintenance',5000,6),
('cleaning','Cleaning',4000,7),('marketing','Marketing',8000,8),('other','Other expenses',6000,9);

insert into public.ingredients (name, category, purchase_unit, purchase_qty, purchase_price, yield_pct) values
('Mutton (bone-in)','Meat','kg',1,850,92),
('Mutton trotters (paaya)','Meat','kg',1,380,70),
('Mutton botti (tripe)','Meat','kg',1,300,65),
('Basmati rice','Grains','kg',1,140,100),
('Maida','Grains','kg',1,45,100),
('Onion','Vegetables','kg',1,35,90),
('Tomato','Vegetables','kg',1,30,95),
('Green chilli','Vegetables','kg',1,60,92),
('Coriander leaves','Herbs','kg',1,80,60),
('Mint leaves','Herbs','kg',1,100,50),
('Ginger garlic paste','Spices','kg',1,180,100),
('Coconut','Vegetables','piece',1,35,80),
('Chilli powder','Spices','kg',1,320,100),
('Turmeric powder','Spices','kg',1,250,100),
('Garam masala','Spices','kg',1,800,100),
('Black pepper','Spices','kg',1,700,100),
('Fennel seeds','Spices','kg',1,300,100),
('Salt','Spices','kg',1,25,100),
('Sugar','Grains','kg',1,45,100),
('Sunflower oil','Oils','litre',1,140,100),
('Ghee','Dairy','litre',1,650,100),
('Curd','Dairy','kg',1,70,100),
('Milk','Dairy','litre',1,56,100),
('Eggs','Dairy','piece',30,180,100),
('Parcel container (500 ml)','Packaging','packet',50,250,100);

insert into public.ingredient_price_history (ingredient_id, purchase_unit, purchase_qty, purchase_price, yield_pct, recorded_at)
select id, purchase_unit, purchase_qty, purchase_price, yield_pct, now() from public.ingredients;
insert into public.ingredient_price_history (ingredient_id, purchase_unit, purchase_qty, purchase_price, yield_pct, recorded_at)
select id, purchase_unit, purchase_qty, 780, yield_pct, now() - interval '60 days' from public.ingredients where name='Mutton (bone-in)';

insert into public.recipes (name, category, batch_portions, portion_note, wastage_pct, packaging_cost, fuel_cost, selling_price, monthly_portions) values
('Mutton Kaal Paaya','Soups & Gravies',10,'1 bowl (~300 ml)',3,8,6,220,600),
('Mutton Botti','Starters',8,'1 plate (~150 g)',3,8,5,160,400),
('Fried Parotta','Breads',10,'2 pieces per plate',2,4,3,60,1500),
('Mutton Biryani','Biryani',10,'1 plate (~450 g)',4,15,10,260,900);

insert into public.menu_prices (recipe_id, price) select id, selling_price from public.recipes;

with r as (select id, name from public.recipes), i as (select id, name from public.ingredients),
lines(rname, iname, qty, unit, ord) as (values
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
('Mutton Biryani','Turmeric powder',5,'g',13),('Mutton Biryani','Salt',50,'g',14),('Mutton Biryani','Green chilli',50,'g',15))
insert into public.recipe_ingredients (recipe_id, ingredient_id, quantity, unit, sort_order)
select r.id, i.id, l.qty, l.unit, l.ord from lines l join r on r.name=l.rname join i on i.name=l.iname;
