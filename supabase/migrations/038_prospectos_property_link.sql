-- Migration 038: Link prospectos to the property they're inquiring about

ALTER TABLE public.prospectos
  ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_prospectos_property ON public.prospectos(property_id);
