-- Altaprop CRM Database Schema

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles table (extends auth.users)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  role text not null default 'POSTULANTE' check (role in ('SUPERADMINBOSS', 'SUPERADMIN', 'AGENTE', 'PROPIETARIO', 'POSTULANTE')),
  full_name text,
  phone text,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Properties table
create table public.properties (
  id uuid default gen_random_uuid() primary key,
  owner_id uuid references public.profiles(id) not null,
  agent_id uuid references public.profiles(id),
  title text not null,
  description text,
  type text not null check (type in ('departamento', 'casa', 'villa', 'terreno', 'oficina', 'local')),
  operation text not null check (operation in ('arriendo', 'venta')),
  price numeric not null,
  currency text default 'CLP' check (currency in ('CLP', 'UF', 'USD')),
  address text,
  city text,
  sector text,
  bedrooms integer,
  bathrooms integer,
  sqm numeric,
  status text default 'available' check (status in ('available', 'reserved', 'rented', 'sold')),
  featured boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Property images
create table public.property_images (
  id uuid default gen_random_uuid() primary key,
  property_id uuid references public.properties(id) on delete cascade not null,
  url text not null,
  "order" integer default 0,
  created_at timestamptz default now()
);

-- Applications
create table public.applications (
  id uuid default gen_random_uuid() primary key,
  property_id uuid references public.properties(id) not null,
  applicant_id uuid references public.profiles(id) not null,
  status text default 'pending' check (status in ('pending', 'reviewing', 'approved', 'rejected')),
  message text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Application documents
create table public.application_documents (
  id uuid default gen_random_uuid() primary key,
  application_id uuid references public.applications(id) on delete cascade not null,
  name text not null,
  url text not null,
  type text,
  created_at timestamptz default now()
);

-- Indexes
create index idx_properties_owner on public.properties(owner_id);
create index idx_properties_agent on public.properties(agent_id);
create index idx_properties_status on public.properties(status);
create index idx_properties_city_sector on public.properties(city, sector);
create index idx_properties_operation on public.properties(operation);
create index idx_property_images_property on public.property_images(property_id);
create index idx_applications_property on public.applications(property_id);
create index idx_applications_applicant on public.applications(applicant_id);
create index idx_application_docs_application on public.application_documents(application_id);

-- Auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, role, full_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'role', 'POSTULANTE'),
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'phone'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Updated_at trigger
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at before update on public.profiles
  for each row execute procedure public.handle_updated_at();
create trigger set_updated_at before update on public.properties
  for each row execute procedure public.handle_updated_at();
create trigger set_updated_at before update on public.applications
  for each row execute procedure public.handle_updated_at();
