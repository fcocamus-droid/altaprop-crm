-- Red de Canjes: claims table
-- Allows a subscriber org to "claim" a propietario listing for up to 30 days,
-- signalling to other orgs that it's already being managed.

create table if not exists red_canjes_claims (
  id               uuid primary key default gen_random_uuid(),
  propietario_id   uuid not null references profiles(id) on delete cascade,
  -- property_id can be null for metadata-only listings (no linked property yet)
  property_id      uuid references properties(id) on delete cascade,
  -- The subscriber org that claimed it
  subscriber_id    uuid not null references profiles(id) on delete cascade,
  -- The specific user (SUPERADMIN or AGENTE) who clicked "Tomar gestión"
  claimed_by_user_id uuid not null references profiles(id) on delete cascade,
  claimed_by_name  text,
  subscriber_name  text,
  notes            text,
  status           text not null default 'active' check (status in ('active', 'released', 'expired')),
  claimed_at       timestamptz not null default now(),
  expires_at       timestamptz not null default (now() + interval '30 days'),
  released_at      timestamptz,
  created_at       timestamptz not null default now()
);

-- Index for fast lookup by propietario
create index if not exists idx_red_canjes_claims_propietario on red_canjes_claims(propietario_id);
-- Index for fast lookup by subscriber
create index if not exists idx_red_canjes_claims_subscriber on red_canjes_claims(subscriber_id);
-- Only one active claim per propietario at a time
create unique index if not exists idx_red_canjes_claims_active_unique
  on red_canjes_claims(propietario_id)
  where status = 'active';

-- RLS
alter table red_canjes_claims enable row level security;

-- Service role has full access (used by API routes with admin client)
create policy "service role full access" on red_canjes_claims
  for all
  using (true)
  with check (true);
