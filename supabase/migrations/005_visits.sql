-- Migration: Visits (property scheduling)

create table public.visits (
  id uuid default gen_random_uuid() primary key,
  property_id uuid references public.properties(id) on delete cascade not null,
  visitor_id uuid references public.profiles(id) not null,
  scheduled_at timestamptz not null,
  status text default 'pending' check (status in ('pending', 'confirmed', 'completed', 'canceled')),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_visits_property on public.visits(property_id);
create index idx_visits_visitor on public.visits(visitor_id);
create index idx_visits_scheduled on public.visits(scheduled_at);
create index idx_visits_status on public.visits(status);

create trigger set_updated_at before update on public.visits
  for each row execute procedure public.handle_updated_at();

-- RLS
alter table public.visits enable row level security;

create policy "Admins can view all visits"
  on public.visits for select
  using (public.get_user_role() in ('SUPERADMINBOSS', 'SUPERADMIN'));

create policy "Agents can view visits on assigned properties"
  on public.visits for select
  using (exists (select 1 from public.properties where id = property_id and agent_id = auth.uid()));

create policy "Owners can view visits on their properties"
  on public.visits for select
  using (exists (select 1 from public.properties where id = property_id and owner_id = auth.uid()));

create policy "Visitors can view own visits"
  on public.visits for select
  using (auth.uid() = visitor_id);

create policy "Property managers can create visits"
  on public.visits for insert
  with check (public.get_user_role() in ('SUPERADMINBOSS', 'SUPERADMIN', 'AGENTE', 'PROPIETARIO'));

create policy "Admins and agents can update visits"
  on public.visits for update
  using (
    public.get_user_role() in ('SUPERADMINBOSS', 'SUPERADMIN')
    or exists (select 1 from public.properties where id = property_id and (owner_id = auth.uid() or agent_id = auth.uid()))
  );

create policy "Admins can delete visits"
  on public.visits for delete
  using (public.get_user_role() in ('SUPERADMINBOSS', 'SUPERADMIN'));
