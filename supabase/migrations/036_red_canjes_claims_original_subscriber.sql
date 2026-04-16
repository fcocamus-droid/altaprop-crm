-- Red de Canjes: store original subscriber_id so it can be restored on release/expire
alter table red_canjes_claims
  add column if not exists original_subscriber_id uuid references profiles(id) on delete set null;
