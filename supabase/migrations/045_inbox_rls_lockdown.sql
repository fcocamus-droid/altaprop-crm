-- ── Inbox tables: Row-Level Security ─────────────────────────────────────────
-- The integrations table stores per-subscriber WhatsApp access tokens and app
-- secrets in jsonb. Without RLS, any client with the public anon key can
-- select * and exfiltrate them. ai_configs holds the per-tenant system prompt
-- (business strategy). conversations + messages are PII-heavy and broadcast
-- via Realtime to whoever subscribes — so they must be filtered server-side.
--
-- Server code uses the service role key via createAdminClient() and bypasses
-- RLS as designed. Policies only constrain client-side reads (PostgREST + the
-- Realtime broadcaster) so visibility matches the access rules in route.ts.

-- ── integrations: only the owning subscriber + boss ──────────────────────────
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS integrations_owner_or_boss ON public.integrations;
CREATE POLICY integrations_owner_or_boss ON public.integrations
  FOR ALL
  USING (
    subscriber_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'SUPERADMINBOSS')
  )
  WITH CHECK (
    subscriber_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'SUPERADMINBOSS')
  );

-- ── ai_configs: same pattern ─────────────────────────────────────────────────
ALTER TABLE public.ai_configs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ai_configs_owner_or_boss ON public.ai_configs;
CREATE POLICY ai_configs_owner_or_boss ON public.ai_configs
  FOR ALL
  USING (
    subscriber_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'SUPERADMINBOSS')
  )
  WITH CHECK (
    subscriber_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'SUPERADMINBOSS')
  );

-- ── Helper: shared visibility check used by conversations + messages ─────────
-- SECURITY DEFINER so the policy can read the caller's profile row even if
-- the caller's RLS would otherwise hide it.
CREATE OR REPLACE FUNCTION public.fn_can_see_conversation(
  conv_subscriber_id uuid,
  conv_agent_id      uuid
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (
        p.role = 'SUPERADMINBOSS'
        OR (p.role = 'SUPERADMIN' AND conv_subscriber_id = p.id)
        OR (p.role = 'AGENTE' AND (conv_subscriber_id = p.subscriber_id OR conv_agent_id = p.id))
      )
  )
$$;

-- ── conversations: team pool + own assignments ───────────────────────────────
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS conversations_visibility ON public.conversations;
CREATE POLICY conversations_visibility ON public.conversations
  FOR ALL
  USING (public.fn_can_see_conversation(subscriber_id, agent_id))
  WITH CHECK (public.fn_can_see_conversation(subscriber_id, agent_id));

-- ── messages: inherit visibility from conversation ───────────────────────────
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS messages_via_conversation ON public.messages;
CREATE POLICY messages_via_conversation ON public.messages
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
        AND public.fn_can_see_conversation(c.subscriber_id, c.agent_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
        AND public.fn_can_see_conversation(c.subscriber_id, c.agent_id)
    )
  );
