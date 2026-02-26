-- ============================================================
-- DEPRECATED — Supabase Schema (archived 2026-02-26)
-- ============================================================
-- This file is kept for historical reference only.
-- Synplix has standardised on Firebase Firestore as its sole
-- backend. This Supabase schema is no longer in use.
-- See FIREBASE_SETUP.md for the current backend setup guide.
-- ============================================================
-- Applix Infotech — Supabase Schema
-- Run in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

create extension if not exists "uuid-ossp";

-- ── Profiles (linked to auth.users) ──────────────────────────
create table public.profiles (
  id                  uuid references auth.users(id) on delete cascade primary key,
  name                text not null default '',
  business_name       text not null default '',
  email               text,
  phone               text default '',
  gst                 text default '',
  address             text default '',
  currency            text default 'INR',
  email_notifications boolean default true,
  dark_mode           boolean default true,
  two_factor_auth     boolean default false,
  onboarding_complete boolean default false,
  created_at          timestamptz default now()
);

-- ── Employees ────────────────────────────────────────────────
create table public.employees (
  id                     uuid default uuid_generate_v4() primary key,
  user_id                uuid references auth.users(id) on delete cascade not null,
  name                   text not null,
  role                   text default 'Team Member',
  avatar                 text default '',
  salary                 numeric default 0,
  date_of_joining        date,
  salary_deduction_rules text default '',
  email                  text default '',
  phone                  text default '',
  aadhaar                text default '',
  attendance             jsonb default '{}',
  overtime               jsonb default '{}',
  created_at             timestamptz default now()
);

-- Migration (run if table already exists):
-- alter table public.employees add column if not exists salary                 numeric default 0;
-- alter table public.employees add column if not exists date_of_joining        date;
-- alter table public.employees add column if not exists salary_deduction_rules text default '';
-- alter table public.employees add column if not exists email                  text default '';
-- alter table public.employees add column if not exists phone                  text default '';
-- alter table public.employees add column if not exists aadhaar                text default '';
-- alter table public.employees add column if not exists attendance             jsonb default '{}';
-- alter table public.employees add column if not exists overtime               jsonb default '{}';

-- ── Attendance ───────────────────────────────────────────────
create table public.attendance (
  id          uuid default uuid_generate_v4() primary key,
  employee_id uuid references public.employees(id) on delete cascade not null,
  user_id     uuid references auth.users(id) on delete cascade not null,
  date        date not null,
  status      text check (status in ('present', 'absent')) not null,
  created_at  timestamptz default now(),
  unique(employee_id, date)
);

-- ── Invoices ─────────────────────────────────────────────────
create table public.invoices (
  id              uuid default uuid_generate_v4() primary key,
  user_id         uuid references auth.users(id) on delete cascade not null,
  invoice_no      text not null,
  client          text not null,
  client_email    text default '',
  client_phone    text default '',
  client_address  text default '',
  date            date not null,
  due_date        date not null,
  status          text check (status in ('Paid', 'Pending')) default 'Pending',
  created_at      timestamptz default now()
);

-- Migration (run if table already exists):
-- alter table public.invoices add column if not exists client_email   text default '';
-- alter table public.invoices add column if not exists client_phone   text default '';
-- alter table public.invoices add column if not exists client_address text default '';

-- ── Invoice Items ────────────────────────────────────────────
create table public.invoice_items (
  id          uuid default uuid_generate_v4() primary key,
  invoice_id  uuid references public.invoices(id) on delete cascade not null,
  user_id     uuid references auth.users(id) on delete cascade not null,
  description text not null,
  qty         integer not null default 1,
  price       numeric not null default 0
);

-- ── Transactions ─────────────────────────────────────────────
create table public.transactions (
  id         uuid default uuid_generate_v4() primary key,
  user_id    uuid references auth.users(id) on delete cascade not null,
  type       text check (type in ('Income', 'Expense')) not null,
  category   text not null,
  amount     numeric not null,
  date       date not null,
  note       text default '',
  created_at timestamptz default now()
);

-- ── Inventory ────────────────────────────────────────────────
create table public.inventory (
  id             uuid default uuid_generate_v4() primary key,
  user_id        uuid references auth.users(id) on delete cascade not null,
  name           text not null,
  sku            text default '',
  category       text default 'General',
  unit           text default 'Units',
  opening_qty    integer default 0,
  current_qty    integer default 0,
  purchase_price numeric default 0,
  selling_price  numeric default 0,
  reorder_level  integer default 0,
  gst_rate       numeric default 18,
  created_at     timestamptz default now()
);

-- ── Row Level Security ───────────────────────────────────────
alter table public.profiles   enable row level security;
alter table public.employees  enable row level security;
alter table public.attendance enable row level security;
alter table public.invoices   enable row level security;
alter table public.invoice_items enable row level security;
alter table public.transactions enable row level security;
alter table public.inventory  enable row level security;

-- ── Support Requests ─────────────────────────────────────────
create table if not exists public.support_requests (
  id         uuid default uuid_generate_v4() primary key,
  user_id    uuid references auth.users(id) on delete set null,
  name       text not null,
  email      text not null,
  message    text not null,
  created_at timestamptz default now()
);

alter table public.support_requests enable row level security;

-- Profiles
create policy "own profile select" on public.profiles for select using (auth.uid() = id);
create policy "own profile insert" on public.profiles for insert with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update using (auth.uid() = id);

-- Employees
create policy "own employees select" on public.employees for select using (auth.uid() = user_id);
create policy "own employees insert" on public.employees for insert with check (auth.uid() = user_id);
create policy "own employees update" on public.employees for update using (auth.uid() = user_id);
create policy "own employees delete" on public.employees for delete using (auth.uid() = user_id);

-- Attendance
create policy "own attendance select" on public.attendance for select using (auth.uid() = user_id);
create policy "own attendance insert" on public.attendance for insert with check (auth.uid() = user_id);
create policy "own attendance update" on public.attendance for update using (auth.uid() = user_id);
create policy "own attendance delete" on public.attendance for delete using (auth.uid() = user_id);

-- Invoices
create policy "own invoices select" on public.invoices for select using (auth.uid() = user_id);
create policy "own invoices insert" on public.invoices for insert with check (auth.uid() = user_id);
create policy "own invoices update" on public.invoices for update using (auth.uid() = user_id);
create policy "own invoices delete" on public.invoices for delete using (auth.uid() = user_id);

-- Invoice Items (direct user_id — avoids INSERT race condition)
create policy "own invoice_items select" on public.invoice_items for select using (auth.uid() = user_id);
create policy "own invoice_items insert" on public.invoice_items for insert with check (auth.uid() = user_id);
create policy "own invoice_items update" on public.invoice_items for update using (auth.uid() = user_id);
create policy "own invoice_items delete" on public.invoice_items for delete using (auth.uid() = user_id);

-- Transactions
create policy "own transactions select" on public.transactions for select using (auth.uid() = user_id);
create policy "own transactions insert" on public.transactions for insert with check (auth.uid() = user_id);
create policy "own transactions update" on public.transactions for update using (auth.uid() = user_id);
create policy "own transactions delete" on public.transactions for delete using (auth.uid() = user_id);

-- Inventory
create policy "own inventory select" on public.inventory for select using (auth.uid() = user_id);
create policy "own inventory insert" on public.inventory for insert with check (auth.uid() = user_id);
create policy "own inventory update" on public.inventory for update using (auth.uid() = user_id);
create policy "own inventory delete" on public.inventory for delete using (auth.uid() = user_id);

-- Support requests
create policy "own support_requests insert" on public.support_requests for insert
  with check (auth.uid() = user_id or user_id is null);
create policy "own support_requests select" on public.support_requests for select
  using (auth.uid() = user_id);

-- ── Auto-create profile on signup ───────────────────────────
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
