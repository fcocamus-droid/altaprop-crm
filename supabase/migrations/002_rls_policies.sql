-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.properties enable row level security;
alter table public.property_images enable row level security;
alter table public.applications enable row level security;
alter table public.application_documents enable row level security;

-- Helper function to get current user role
create or replace function public.get_user_role()
returns text as $$
  select role from public.profiles where id = auth.uid();
$$ language sql security definer stable;

-- PROFILES policies
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Admins and agents can view all profiles"
  on public.profiles for select
  using (public.get_user_role() in ('SUPERADMIN', 'AGENTE'));

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Admins can update any profile"
  on public.profiles for update
  using (public.get_user_role() = 'SUPERADMIN');

-- PROPERTIES policies
create policy "Anyone can view available properties"
  on public.properties for select
  using (status = 'available');

create policy "Owners can view own properties"
  on public.properties for select
  using (auth.uid() = owner_id);

create policy "Agents can view assigned properties"
  on public.properties for select
  using (auth.uid() = agent_id);

create policy "Admins can view all properties"
  on public.properties for select
  using (public.get_user_role() = 'SUPERADMIN');

create policy "Owners agents admins can insert properties"
  on public.properties for insert
  with check (public.get_user_role() in ('SUPERADMIN', 'AGENTE', 'PROPIETARIO'));

create policy "Owners can update own properties"
  on public.properties for update
  using (auth.uid() = owner_id);

create policy "Agents can update assigned properties"
  on public.properties for update
  using (auth.uid() = agent_id);

create policy "Admins can update any property"
  on public.properties for update
  using (public.get_user_role() = 'SUPERADMIN');

create policy "Admins can delete any property"
  on public.properties for delete
  using (public.get_user_role() = 'SUPERADMIN');

create policy "Owners can delete own properties"
  on public.properties for delete
  using (auth.uid() = owner_id);

-- PROPERTY IMAGES policies
create policy "Anyone can view property images"
  on public.property_images for select
  using (true);

create policy "Property owners can manage images"
  on public.property_images for insert
  with check (
    exists (
      select 1 from public.properties
      where id = property_id and (owner_id = auth.uid() or agent_id = auth.uid())
    )
    or public.get_user_role() = 'SUPERADMIN'
  );

create policy "Property owners can delete images"
  on public.property_images for delete
  using (
    exists (
      select 1 from public.properties
      where id = property_id and (owner_id = auth.uid() or agent_id = auth.uid())
    )
    or public.get_user_role() = 'SUPERADMIN'
  );

-- APPLICATIONS policies
create policy "Applicants can view own applications"
  on public.applications for select
  using (auth.uid() = applicant_id);

create policy "Owners can view applications on their properties"
  on public.applications for select
  using (
    exists (
      select 1 from public.properties
      where id = property_id and owner_id = auth.uid()
    )
  );

create policy "Agents can view applications on assigned properties"
  on public.applications for select
  using (
    exists (
      select 1 from public.properties
      where id = property_id and agent_id = auth.uid()
    )
  );

create policy "Admins can view all applications"
  on public.applications for select
  using (public.get_user_role() = 'SUPERADMIN');

create policy "Postulantes can create applications"
  on public.applications for insert
  with check (public.get_user_role() = 'POSTULANTE' and auth.uid() = applicant_id);

create policy "Owners agents admins can update application status"
  on public.applications for update
  using (
    exists (
      select 1 from public.properties
      where id = property_id and (owner_id = auth.uid() or agent_id = auth.uid())
    )
    or public.get_user_role() = 'SUPERADMIN'
  );

create policy "Applicants can delete own pending applications"
  on public.applications for delete
  using (auth.uid() = applicant_id and status = 'pending');

-- APPLICATION DOCUMENTS policies
create policy "Document viewers match application access"
  on public.application_documents for select
  using (
    exists (
      select 1 from public.applications a
      where a.id = application_id
      and (
        a.applicant_id = auth.uid()
        or exists (
          select 1 from public.properties p
          where p.id = a.property_id and (p.owner_id = auth.uid() or p.agent_id = auth.uid())
        )
        or public.get_user_role() = 'SUPERADMIN'
      )
    )
  );

create policy "Applicants can upload documents"
  on public.application_documents for insert
  with check (
    exists (
      select 1 from public.applications
      where id = application_id and applicant_id = auth.uid()
    )
  );

-- Storage buckets (run these separately in Supabase dashboard or via API)
-- insert into storage.buckets (id, name, public) values ('property-images', 'property-images', true);
-- insert into storage.buckets (id, name, public) values ('application-documents', 'application-documents', false);
