-- Migration 021: Add rental contract fields to applications
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS rental_contract_url  TEXT,
  ADD COLUMN IF NOT EXISTS rental_contract_name TEXT;
