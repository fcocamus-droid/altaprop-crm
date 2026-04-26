-- ── Enable Realtime on inbox tables ───────────────────────────────────────────
-- Required for the conversations inbox to receive live updates without polling.
-- Idempotent: ALTER PUBLICATION ADD TABLE silently no-ops if already added in
-- some Postgres versions, but we wrap in DO blocks to be safe.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'conversations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
  END IF;
END $$;

-- REPLICA IDENTITY FULL ensures UPDATE events carry every column (otherwise
-- only the primary key + changed columns ship — breaks our setMessages map).
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.conversations REPLICA IDENTITY FULL;
