-- Migration 020: Add correlative visit_number starting at 75
CREATE SEQUENCE IF NOT EXISTS public.visits_number_seq START 75;
ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS visit_number INTEGER DEFAULT nextval('public.visits_number_seq');
CREATE UNIQUE INDEX IF NOT EXISTS idx_visits_visit_number ON public.visits(visit_number);
