-- Migration 022: Commission payment fields for applications
-- Tracks MercadoPago commission payments (50% applicant + 50% owner)

ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS commission_amount          NUMERIC,
  ADD COLUMN IF NOT EXISTS commission_paid_applicant  BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS commission_paid_owner      BOOLEAN NOT NULL DEFAULT FALSE;
