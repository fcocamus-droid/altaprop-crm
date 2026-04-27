-- ── Internal notes on conversations ───────────────────────────────────────────
-- Internal notes look like messages but never leave our system: they're not
-- sent via any channel (WhatsApp, email, etc.) and are only visible in the
-- inbox UI to subscribers / agents / the boss.

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS is_internal boolean NOT NULL DEFAULT false;

-- Partial index keeps the table compact while making "show me only the notes
-- on this conversation" queries cheap.
CREATE INDEX IF NOT EXISTS idx_messages_internal
  ON public.messages (conversation_id)
  WHERE is_internal = true;

-- Internal notes must not bump last_message_at, last_message_preview, or
-- unread_count on the parent conversation (they're staff-only context).
CREATE OR REPLACE FUNCTION public.tg_conversation_last_message() RETURNS trigger AS $$
BEGIN
  IF NEW.is_internal THEN
    RETURN NEW;
  END IF;
  UPDATE public.conversations
    SET last_message_at        = NEW.sent_at,
        last_message_preview   = LEFT(COALESCE(NEW.content, '[multimedia]'), 140),
        last_message_direction = NEW.direction,
        unread_count           = CASE WHEN NEW.direction = 'inbound' THEN unread_count + 1 ELSE unread_count END
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
