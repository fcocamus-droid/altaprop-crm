-- Add RUT field to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS rut text;
