-- Blocked time slots for visit scheduling
create table public.blocked_slots (
  id uuid default gen_random_uuid() primary key,
  subscriber_id uuid references public.profiles(id) not null,
  blocked_date date not null,
  blocked_time time,
  full_day boolean default false,
  created_at timestamptz default now()
);

create index idx_blocked_slots_subscriber on public.blocked_slots(subscriber_id);
create index idx_blocked_slots_date on public.blocked_slots(blocked_date);

alter table public.blocked_slots enable row level security;

create policy "Admins manage blocked slots" on public.blocked_slots for all
  using (public.get_user_role() in ('SUPERADMINBOSS', 'SUPERADMIN'));

create policy "Anyone can view blocked slots" on public.blocked_slots for select
  using (true);
