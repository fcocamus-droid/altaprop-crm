-- Migration 019: Property inventory table for rented/sold handover records

CREATE TABLE IF NOT EXISTS public.property_inventories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id),

  -- Checklist sections stored as JSONB arrays
  -- Each item: { name, state: 'ok'|'bad'|'na'|null, observation, photos: [url] }
  estado_general JSONB DEFAULT '[
    {"name":"Muros","state":null,"observation":"","photos":[]},
    {"name":"Pisos","state":null,"observation":"","photos":[]},
    {"name":"Techos","state":null,"observation":"","photos":[]},
    {"name":"Puertas y ventanas","state":null,"observation":"","photos":[]}
  ]'::jsonb,

  instalaciones JSONB DEFAULT '[
    {"name":"Instalación eléctrica","state":null,"observation":"","photos":[]},
    {"name":"Instalación de gas","state":null,"observation":"","photos":[]},
    {"name":"Agua y alcantarillado","state":null,"observation":"","photos":[]}
  ]'::jsonb,

  equipamiento JSONB DEFAULT '[
    {"name":"Cocina / Encimera","state":null,"observation":"","photos":[]},
    {"name":"Horno","state":null,"observation":"","photos":[]},
    {"name":"Campana","state":null,"observation":"","photos":[]},
    {"name":"Calefacción","state":null,"observation":"","photos":[]},
    {"name":"Otros","state":null,"observation":"","photos":[]}
  ]'::jsonb,

  -- Meter readings
  medidor_electricidad TEXT,
  medidor_agua TEXT,
  medidor_gas TEXT,

  -- Keys
  llaves_cantidad INTEGER,
  llaves_detalle TEXT,

  -- General observations
  observaciones TEXT,

  -- Digital signatures (base64 PNG data URLs)
  firma_arrendador TEXT,
  firma_arrendatario TEXT,
  firma_altaprop TEXT,

  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'completed')),

  -- Metadata
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS (service role client used in API, bypasses RLS)
ALTER TABLE public.property_inventories ENABLE ROW LEVEL SECURITY;

-- Allow applicants to view their own inventory and sign
CREATE POLICY "applicant_view_inventory" ON public.property_inventories
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.applications
      WHERE id = application_id AND applicant_id = auth.uid()
    )
  );
