-- Migration 039: Add prospect type (what role this person has)

ALTER TABLE public.prospectos
  ADD COLUMN IF NOT EXISTS tipo text
  CHECK (tipo IN ('visita','postulante','propietario','inmobiliaria','corredor'));

CREATE INDEX IF NOT EXISTS idx_prospectos_tipo ON public.prospectos(tipo);
