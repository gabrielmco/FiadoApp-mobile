-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Clients Table
create table public.clients (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  phone text,
  credit numeric default 0,
  total_debt numeric default 0,
  last_interaction timestamp with time zone default now(),
  created_at timestamp with time zone default now()
);

-- 2. Products Table
create table public.products (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  department text default 'Geral',
  sub_category text default 'Outros',
  category text, -- Legacy
  animal_type text, -- Legacy
  price numeric not null,
  cost numeric,
  unit text check (unit in ('UN', 'KG', 'LT', 'CX', 'MT', 'PAR')),
  stock numeric default 0,
  track_stock boolean default false,
  created_at timestamp with time zone default now()
);

-- 3. Sales Table
create table public.sales (
  id uuid default uuid_generate_v4() primary key,
  client_id uuid references public.clients(id),
  client_name text, -- Snapshot
  type text check (type in ('CASH', 'CREDIT')),
  subtotal numeric not null,
  discount_or_adjustment numeric default 0,
  final_total numeric not null,
  remaining_balance numeric,
  timestamp timestamp with time zone default now(),
  status text check (status in ('PAID', 'PENDING', 'PARTIAL')),
  created_at timestamp with time zone default now()
);

-- 4. Sale Items Table
create table public.sale_items (
  id uuid default uuid_generate_v4() primary key,
  sale_id uuid references public.sales(id) on delete cascade,
  product_id uuid references public.products(id),
  product_name text not null,
  quantity numeric not null,
  unit_price numeric not null,
  total numeric not null
);

-- 5. Payment Records Table
create table public.payment_records (
  id uuid default uuid_generate_v4() primary key,
  client_id uuid references public.clients(id),
  amount numeric not null,
  timestamp timestamp with time zone default now(),
  used_credit boolean default false
);

-- 6. Expenses Table
create table public.expenses (
  id uuid default uuid_generate_v4() primary key,
  description text not null,
  amount numeric not null,
  category text check (category in ('FIXED', 'VARIABLE')),
  date timestamp with time zone not null,
  created_at timestamp with time zone default now()
);
