-- Migration 037: CRM Prospectos (sales pipeline for real estate leads)

-- ── MAIN TABLE ────────────────────────────────────────────────────────────────
CREATE TABLE public.prospectos (
  id                 uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  subscriber_id      uuid        REFERENCES public.profiles(id) ON DELETE CASCADE,
  agent_id           uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by         uuid        NOT NULL REFERENCES public.profiles(id),

  -- Contact info
  full_name          text        NOT NULL CHECK (char_length(full_name) > 0),
  company            text,
  rut                text,
  email              text,
  phone              text,

  -- Sales pipeline
  status             text        NOT NULL DEFAULT 'nuevo'
                                 CHECK (status IN (
                                   'nuevo','contactado','calificado','propuesta',
                                   'negociacion','ganado','perdido','seguimiento'
                                 )),
  priority           text        NOT NULL DEFAULT 'media'
                                 CHECK (priority IN ('alta','media','baja')),

  -- Qualification
  source             text        CHECK (source IN (
                                   'web','referido','cold_call','evento',
                                   'redes_sociales','portal','whatsapp','otro'
                                 )),
  interest           text        CHECK (interest IN ('arriendo','venta','inversion','ambos')),
  property_type      text        CHECK (property_type IN (
                                   'depto','casa','oficina','local','terreno','parcela','otro'
                                 )),
  budget_min         numeric,
  budget_max         numeric,
  budget_currency    text        DEFAULT 'CLP' CHECK (budget_currency IN ('CLP','UF','USD')),

  -- Free-form notes (cumulative log synced in UI)
  notes              text,

  -- Task / follow-up
  next_action_at     timestamptz,
  next_action_note   text,
  last_contact_at    timestamptz,

  -- User-controlled pin (always on top)
  is_pinned          boolean     DEFAULT false,

  created_at         timestamptz DEFAULT now() NOT NULL,
  updated_at         timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_prospectos_subscriber ON public.prospectos(subscriber_id);
CREATE INDEX idx_prospectos_agent      ON public.prospectos(agent_id);
CREATE INDEX idx_prospectos_status     ON public.prospectos(status);
CREATE INDEX idx_prospectos_priority   ON public.prospectos(priority);
CREATE INDEX idx_prospectos_next_action ON public.prospectos(next_action_at);
CREATE INDEX idx_prospectos_created    ON public.prospectos(created_at DESC);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.prospectos_set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prospectos_updated_at_trigger
  BEFORE UPDATE ON public.prospectos
  FOR EACH ROW EXECUTE FUNCTION public.prospectos_set_updated_at();


-- ── ACTIVITY LOG TABLE (bitácora) ─────────────────────────────────────────────
CREATE TABLE public.prospecto_activities (
  id             uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  prospecto_id   uuid        NOT NULL REFERENCES public.prospectos(id) ON DELETE CASCADE,
  agent_id       uuid        NOT NULL REFERENCES public.profiles(id),
  agent_name     text        NOT NULL,
  subscriber_id  uuid        REFERENCES public.profiles(id),

  type           text        NOT NULL DEFAULT 'nota'
                             CHECK (type IN ('nota','llamada','email','reunion','whatsapp','visita','tarea')),
  content        text        NOT NULL CHECK (char_length(content) > 0 AND char_length(content) <= 2000),

  -- If type = 'tarea', allow due date & completion toggle
  is_important   boolean     DEFAULT false,
  is_completed   boolean     DEFAULT false,
  due_at         timestamptz,

  created_at     timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_prospecto_activities_prospecto ON public.prospecto_activities(prospecto_id, created_at DESC);
CREATE INDEX idx_prospecto_activities_agent     ON public.prospecto_activities(agent_id);
CREATE INDEX idx_prospecto_activities_sub       ON public.prospecto_activities(subscriber_id);


-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.prospectos           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospecto_activities ENABLE ROW LEVEL SECURITY;

-- SUPERADMINBOSS: sees all
-- SUPERADMIN: sees prospectos where subscriber_id = their subscriber_id (or their own id)
-- AGENTE: sees prospectos where agent_id = their id OR where subscriber_id matches and no agent assigned

CREATE POLICY "prospectos_select" ON public.prospectos FOR SELECT
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'SUPERADMINBOSS'
    OR (
      (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'SUPERADMIN'
      AND subscriber_id = COALESCE(
        (SELECT subscriber_id FROM public.profiles WHERE id = auth.uid()),
        auth.uid()
      )
    )
    OR (
      (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'AGENTE'
      AND (agent_id = auth.uid()
           OR subscriber_id = (SELECT subscriber_id FROM public.profiles WHERE id = auth.uid()))
    )
  );

CREATE POLICY "prospectos_insert" ON public.prospectos FOR INSERT
  WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN
      ('SUPERADMINBOSS','SUPERADMIN','AGENTE')
    AND created_by = auth.uid()
  );

CREATE POLICY "prospectos_update" ON public.prospectos FOR UPDATE
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'SUPERADMINBOSS'
    OR (
      (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'SUPERADMIN'
      AND subscriber_id = COALESCE(
        (SELECT subscriber_id FROM public.profiles WHERE id = auth.uid()),
        auth.uid()
      )
    )
    OR (
      (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'AGENTE'
      AND agent_id = auth.uid()
    )
  );

CREATE POLICY "prospectos_delete" ON public.prospectos FOR DELETE
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('SUPERADMINBOSS','SUPERADMIN')
  );

-- Activities: scoped via prospecto
CREATE POLICY "prospecto_activities_select" ON public.prospecto_activities FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.prospectos p
      WHERE p.id = prospecto_id
      -- Reuse the prospectos_select logic via this existence check — RLS on prospectos filters which rows are visible
    )
  );

CREATE POLICY "prospecto_activities_insert" ON public.prospecto_activities FOR INSERT
  WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('SUPERADMINBOSS','SUPERADMIN','AGENTE')
    AND agent_id = auth.uid()
  );

CREATE POLICY "prospecto_activities_update" ON public.prospecto_activities FOR UPDATE
  USING (
    agent_id = auth.uid()
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('SUPERADMINBOSS','SUPERADMIN')
  );

CREATE POLICY "prospecto_activities_delete" ON public.prospecto_activities FOR DELETE
  USING (
    agent_id = auth.uid()
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('SUPERADMINBOSS','SUPERADMIN')
  );
