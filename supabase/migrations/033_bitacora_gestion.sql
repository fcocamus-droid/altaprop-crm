-- Migration 033: Bitácora de Gestión (activity log per propietario)

CREATE TABLE public.bitacora_gestion (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  propietario_id  uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  agent_id        uuid        NOT NULL REFERENCES public.profiles(id),
  agent_name      text        NOT NULL,
  content         text        NOT NULL CHECK (char_length(content) > 0 AND char_length(content) <= 2000),
  subscriber_id   uuid        REFERENCES public.profiles(id),
  created_at      timestamptz DEFAULT now() NOT NULL
);

-- Entries are immutable — no updated_at

CREATE INDEX idx_bitacora_propietario ON public.bitacora_gestion(propietario_id, created_at DESC);
CREATE INDEX idx_bitacora_agent      ON public.bitacora_gestion(agent_id);
CREATE INDEX idx_bitacora_subscriber ON public.bitacora_gestion(subscriber_id);

ALTER TABLE public.bitacora_gestion ENABLE ROW LEVEL SECURITY;

-- SELECT: staff roles scoped by subscriber isolation
CREATE POLICY "bitacora_select" ON public.bitacora_gestion FOR SELECT
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'SUPERADMINBOSS'
    OR (
      (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'SUPERADMIN'
      AND subscriber_id = (SELECT subscriber_id FROM public.profiles WHERE id = auth.uid())
    )
    OR (
      (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'AGENTE'
      AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = propietario_id AND agent_id = auth.uid()
      )
    )
  );

-- INSERT: API routes use service role (bypasses RLS), this protects direct client writes
CREATE POLICY "bitacora_insert" ON public.bitacora_gestion FOR INSERT
  WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('SUPERADMINBOSS', 'SUPERADMIN', 'AGENTE')
    AND agent_id = auth.uid()
  );

-- No UPDATE or DELETE — entries are immutable audit records
