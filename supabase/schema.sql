-- ============================================================
-- POS + Workshop Management System
-- Module: Authentication & User Management
-- ============================================================

-- ─── PROFILES ───────────────────────────────────────────────
-- Extends Supabase's built-in auth.users table
create table if not exists public.profiles (
  id           uuid        primary key references auth.users(id) on delete cascade,
  email        text        unique not null,
  full_name    text,
  role         text        not null default 'cashier'
                           check (role in ('admin', 'cashier', 'mechanic')),
  avatar_url   text,
  phone        text,
  is_active    boolean     not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.profiles is
  'Extended user profile linked to Supabase Auth. Stores role and display data.';

-- ─── AUTO-UPDATE updated_at ─────────────────────────────────
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();

-- ─── AUTO-CREATE PROFILE ON SIGNUP ──────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'cashier')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── ROW LEVEL SECURITY ─────────────────────────────────────
alter table public.profiles enable row level security;

-- Everyone can read their own profile
create policy "users_read_own_profile"
  on public.profiles for select
  using (auth.uid() = id);

-- Admins can read all profiles
create policy "admins_read_all_profiles"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Users can update their own non-role fields
create policy "users_update_own_profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (
    -- prevent self-role escalation
    role = (select role from public.profiles where id = auth.uid())
  );

-- Admins can update any profile (including role)
create policy "admins_update_all_profiles"
  on public.profiles for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Admins can insert (create staff accounts)
create policy "admins_insert_profiles"
  on public.profiles for insert
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- ─── INDEXES ────────────────────────────────────────────────
create index if not exists profiles_role_idx on public.profiles(role);
create index if not exists profiles_email_idx on public.profiles(email);
create index if not exists profiles_is_active_idx on public.profiles(is_active);

-- ─── SEED: DEFAULT ADMIN ────────────────────────────────────
-- Run this AFTER creating your first user via the app.
-- Replace 'your-user-uuid' with the UUID from auth.users.
--
-- UPDATE public.profiles
-- SET role = 'admin', full_name = 'Super Admin'
-- WHERE email = 'admin@yourshop.com';

-- ─── SAMPLE DATA (for dev only) ─────────────────────────────
-- These are fake UUIDs. In real use, Supabase creates the auth.users
-- row first, then the trigger creates the profile.
--
-- insert into auth.users (id, email) values
--   ('00000000-0000-0000-0000-000000000001', 'admin@shop.com'),
--   ('00000000-0000-0000-0000-000000000002', 'cashier@shop.com'),
--   ('00000000-0000-0000-0000-000000000003', 'mechanic@shop.com');
--
-- insert into public.profiles (id, email, full_name, role) values
--   ('00000000-0000-0000-0000-000000000001', 'admin@shop.com',    'Alex Admin',      'admin'),
--   ('00000000-0000-0000-0000-000000000002', 'cashier@shop.com',  'Casey Cashier',   'cashier'),
--   ('00000000-0000-0000-0000-000000000003', 'mechanic@shop.com', 'Morgan Mechanic', 'mechanic');
