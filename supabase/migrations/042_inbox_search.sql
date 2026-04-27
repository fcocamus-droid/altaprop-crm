-- ── Trigram index on message content for fast ILIKE search ───────────────────
-- Enables responsive full-text-style search across all messages. The pg_trgm
-- extension is a Supabase preinstalled standard, but ensure it's enabled.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_messages_content_trgm
  ON public.messages USING gin (content gin_trgm_ops);

-- Also add a btree on conversation_id for the join used in the search endpoint
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id
  ON public.messages (conversation_id);
