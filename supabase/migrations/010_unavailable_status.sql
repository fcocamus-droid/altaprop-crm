-- Add 'unavailable' to property status options
ALTER TABLE public.properties DROP CONSTRAINT IF EXISTS properties_status_check;
ALTER TABLE public.properties ADD CONSTRAINT properties_status_check
  CHECK (status IN ('available', 'unavailable', 'reserved', 'rented', 'sold'));
