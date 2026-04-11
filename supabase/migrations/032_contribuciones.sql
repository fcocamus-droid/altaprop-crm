-- Add contribuciones field to properties (only relevant for venta operations)
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS contribuciones integer DEFAULT NULL;
