-- Migration 031: Enhanced property fields (matching Alterestate feature set)

-- ── Expand type options ────────────────────────────────────────────────────────
ALTER TABLE public.properties DROP CONSTRAINT IF EXISTS properties_type_check;
ALTER TABLE public.properties ADD CONSTRAINT properties_type_check CHECK (
  type IN (
    'departamento', 'casa', 'casa_condominio', 'villa', 'quinta',
    'monoambiente', 'terreno', 'terreno_comercial', 'oficina', 'local',
    'hotel', 'nave_industrial', 'bodega', 'edificio'
  )
);

-- ── Expand operation options ───────────────────────────────────────────────────
ALTER TABLE public.properties DROP CONSTRAINT IF EXISTS properties_operation_check;
ALTER TABLE public.properties ADD CONSTRAINT properties_operation_check CHECK (
  operation IN ('arriendo', 'venta', 'arriendo_temporal')
);

-- ── Internal / identification ──────────────────────────────────────────────────
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS private_name text;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS internal_code text;

-- ── Building / unit details ────────────────────────────────────────────────────
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS floor_count integer;        -- total floors in building
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS half_bathrooms integer DEFAULT 0;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS condition text;             -- nuevo, en_construccion, segunda_mano, remodelada, en_planos
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS year_built integer;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS style text;                 -- moderno, minimalista, clasico, colonial, villa

-- ── Surfaces ──────────────────────────────────────────────────────────────────
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS covered_sqm numeric;       -- superficie construida
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS terrace_sqm numeric;       -- superficie terraza/logia

-- ── Flags ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS exclusive boolean DEFAULT false;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS has_sign boolean DEFAULT false;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS keys_count integer DEFAULT 0;

-- ── Multimedia ────────────────────────────────────────────────────────────────
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS video_url text;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS virtual_tour_url text;

-- ── Extended location ─────────────────────────────────────────────────────────
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS region text;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS address2 text;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS zip_code text;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS lat numeric;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS lng numeric;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS show_exact_location boolean DEFAULT true;

-- ── Internal management ───────────────────────────────────────────────────────
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS private_notes text;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS notify_email text;
