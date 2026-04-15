create extension if not exists "pgcrypto";

create table if not exists public.agencies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.agency_users (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'manager', 'member')) default 'owner',
  created_at timestamptz not null default now(),
  unique(agency_id, user_id)
);

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  full_name text not null,
  role text,
  monthly_salary numeric(12,2),
  created_at timestamptz not null default now()
);

create type public.entry_type as enum ('earning', 'expense');

create table if not exists public.finance_entries (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  member_id uuid references public.team_members(id) on delete set null,
  entry_type public.entry_type not null,
  amount numeric(12,2) not null check (amount > 0),
  happened_on date not null,
  name text,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.pending_payments (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  member_id uuid references public.team_members(id) on delete set null,
  payment_type text not null check (payment_type in ('receivable', 'payable')),
  name text not null,
  amount numeric(12,2) not null check (amount > 0),
  due_date date,
  note text,
  is_paid boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_finance_entries_agency_happened_on
  on public.finance_entries (agency_id, happened_on desc);

alter table public.agencies enable row level security;
alter table public.agency_users enable row level security;
alter table public.team_members enable row level security;
alter table public.finance_entries enable row level security;
alter table public.pending_payments enable row level security;

create or replace function public.is_agency_user(target_agency uuid)
returns boolean
language sql
stable
as $$
  select exists(
    select 1
    from public.agency_users au
    where au.agency_id = target_agency and au.user_id = auth.uid()
  );
$$;

create policy "agency users can read their agencies"
  on public.agencies
  for select
  using (public.is_agency_user(id));

create policy "authenticated users can create agencies"
  on public.agencies
  for insert
  to authenticated
  with check (true);

create policy "agency users can read membership"
  on public.agency_users
  for select
  using (user_id = auth.uid() or public.is_agency_user(agency_id));

create policy "owners can insert memberships"
  on public.agency_users
  for insert
  with check (
    exists (
      select 1 from public.agency_users me
      where me.agency_id = agency_users.agency_id
      and me.user_id = auth.uid()
      and me.role in ('owner', 'manager')
    )
  );

create policy "users can insert own membership"
  on public.agency_users
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "agency users can manage team members"
  on public.team_members
  for all
  using (public.is_agency_user(agency_id))
  with check (public.is_agency_user(agency_id));

create policy "agency users can manage entries"
  on public.finance_entries
  for all
  using (public.is_agency_user(agency_id))
  with check (public.is_agency_user(agency_id));

create policy "agency users can manage pending payments"
  on public.pending_payments
  for all
  using (public.is_agency_user(agency_id))
  with check (public.is_agency_user(agency_id));

-- Bootstrap helper: run once from SQL editor after creating your first auth user.
-- replace these values before executing.
-- insert into public.agencies(name) values ('My Agency') returning id;
-- insert into public.agency_users(agency_id, user_id, role)
-- values ('<agency_uuid>', '<auth_user_uuid>', 'owner');
