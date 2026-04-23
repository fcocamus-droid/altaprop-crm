-- Migration 040: Inbox omnicanal (WhatsApp, Meta Ads, Google Ads, Portales, Email)
-- Permite recibir/enviar mensajes desde múltiples canales + conversión automática a prospecto.

-- ── CONVERSATIONS ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.conversations (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id       uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  agent_id            uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  prospecto_id        uuid REFERENCES public.prospectos(id) ON DELETE SET NULL,

  channel             text NOT NULL
                        CHECK (channel IN ('whatsapp','meta_ads','google_ads','portal','email','web')),
  external_id         text,                -- wa_id, fb lead id, google lead id, email thread id
  external_thread_url text,                -- url profunda al origen si aplica

  contact_name        text,
  contact_phone       text,
  contact_email       text,
  contact_rut         text,

  status              text NOT NULL DEFAULT 'open'
                        CHECK (status IN ('open','ai_handling','human_handling','snoozed','closed','converted')),
  ai_enabled          boolean NOT NULL DEFAULT true,

  unread_count        int NOT NULL DEFAULT 0,
  last_message_at     timestamptz,
  last_message_preview text,
  last_message_direction text CHECK (last_message_direction IN ('inbound','outbound')),

  metadata            jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversations_subscriber  ON public.conversations(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_conversations_agent       ON public.conversations(agent_id);
CREATE INDEX IF NOT EXISTS idx_conversations_channel     ON public.conversations(channel);
CREATE INDEX IF NOT EXISTS idx_conversations_status      ON public.conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_last_at     ON public.conversations(last_message_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_conversations_channel_external
  ON public.conversations(channel, external_id) WHERE external_id IS NOT NULL;

-- ── MESSAGES ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.messages (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id   uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,

  direction         text NOT NULL CHECK (direction IN ('inbound','outbound')),
  sender_type       text NOT NULL CHECK (sender_type IN ('contact','ai','agent','system')),
  sender_id         uuid REFERENCES public.profiles(id) ON DELETE SET NULL,

  content           text,
  media_url         text,
  media_type        text CHECK (media_type IN ('image','audio','video','document','location','sticker')),

  external_id       text,                -- wamid de WhatsApp, lead id, etc
  sent_at           timestamptz NOT NULL DEFAULT now(),
  delivered_at      timestamptz,
  read_at           timestamptz,
  error             text,

  metadata          jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_external     ON public.messages(external_id) WHERE external_id IS NOT NULL;

-- ── AI CONFIGS (una por suscriptor) ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_configs (
  subscriber_id     uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  enabled           boolean NOT NULL DEFAULT true,
  persona_name      text NOT NULL DEFAULT 'Sofía',
  greeting          text NOT NULL DEFAULT '¡Hola! Soy Sofía, asistente virtual. ¿En qué te puedo ayudar?',
  system_prompt     text,                -- opcional: prompt custom por suscriptor
  business_hours    jsonb NOT NULL DEFAULT '{"mon":[9,19],"tue":[9,19],"wed":[9,19],"thu":[9,19],"fri":[9,19],"sat":[10,14]}',
  timezone          text NOT NULL DEFAULT 'America/Santiago',
  handoff_keywords  text[] DEFAULT ARRAY['humano','persona real','agente','operador'],
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- ── INTEGRATIONS (credenciales por canal, por suscriptor) ─────────────────────
-- Permite que cada suscriptor conecte su propio WhatsApp / Meta / Google.
CREATE TABLE IF NOT EXISTS public.integrations (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  channel           text NOT NULL CHECK (channel IN ('whatsapp','meta_ads','google_ads','email_forwarding')),
  config            jsonb NOT NULL DEFAULT '{}'::jsonb,   -- { phone_id, waba_id, token_encrypted, ... }
  enabled           boolean NOT NULL DEFAULT true,
  last_verified_at  timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_integrations_subscriber_channel
  ON public.integrations(subscriber_id, channel);

-- ── TRIGGER: updated_at automático ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.tg_touch_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS conversations_touch_updated_at ON public.conversations;
CREATE TRIGGER conversations_touch_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

DROP TRIGGER IF EXISTS ai_configs_touch_updated_at ON public.ai_configs;
CREATE TRIGGER ai_configs_touch_updated_at
  BEFORE UPDATE ON public.ai_configs
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

DROP TRIGGER IF EXISTS integrations_touch_updated_at ON public.integrations;
CREATE TRIGGER integrations_touch_updated_at
  BEFORE UPDATE ON public.integrations
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

-- ── TRIGGER: actualizar last_message_* al insertar mensaje ────────────────────
CREATE OR REPLACE FUNCTION public.tg_conversation_last_message() RETURNS trigger AS $$
BEGIN
  UPDATE public.conversations
    SET last_message_at        = NEW.sent_at,
        last_message_preview   = LEFT(COALESCE(NEW.content, '[multimedia]'), 140),
        last_message_direction = NEW.direction,
        unread_count = CASE WHEN NEW.direction = 'inbound' THEN unread_count + 1 ELSE unread_count END
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS messages_update_conversation ON public.messages;
CREATE TRIGGER messages_update_conversation
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.tg_conversation_last_message();
