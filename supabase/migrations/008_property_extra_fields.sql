-- Extra property fields for better scraping and listing
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS common_expenses integer DEFAULT 0;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS pets_allowed boolean DEFAULT false;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS parking integer DEFAULT 0;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS storage integer DEFAULT 0;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS floor_level integer;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS furnished boolean DEFAULT false;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS amenities text[];
