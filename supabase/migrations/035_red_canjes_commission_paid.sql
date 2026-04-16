-- Red de Canjes: add commission_paid tracking to claims
alter table red_canjes_claims
  add column if not exists commission_paid      boolean not null default false,
  add column if not exists commission_paid_at   timestamptz;
