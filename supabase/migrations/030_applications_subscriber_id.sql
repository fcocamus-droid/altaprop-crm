-- Add subscriber_id to applications for consistent querying (mirrors visits table pattern)
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS subscriber_id uuid REFERENCES public.profiles(id);

-- Backfill from existing property records
UPDATE public.applications a
SET subscriber_id = p.subscriber_id
FROM public.properties p
WHERE p.id = a.property_id AND a.subscriber_id IS NULL;

-- Index for efficient subscriber-scoped queries
CREATE INDEX IF NOT EXISTS idx_applications_subscriber ON public.applications(subscriber_id);
