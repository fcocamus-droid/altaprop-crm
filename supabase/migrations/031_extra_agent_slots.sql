-- Extra agent slots add-on per subscriber
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS extra_agent_slots INTEGER NOT NULL DEFAULT 0;

-- Table to track agent slot purchase requests
CREATE TABLE IF NOT EXISTS agent_slot_requests (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  slots_requested INTEGER NOT NULL DEFAULT 1,
  price_usd   NUMERIC(10,2) NOT NULL DEFAULT 25.00,
  notes       TEXT,
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_slot_requests_subscriber ON agent_slot_requests(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_agent_slot_requests_status ON agent_slot_requests(status);
