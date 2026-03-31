-- Migration 016: Extend application status to include 'rented' and 'sold'
-- These statuses are set automatically when admin finalizes a property
-- from 'reserved' → 'rented' or 'sold' via the finalizeProperty action

-- Drop the existing CHECK constraint
ALTER TABLE public.applications
  DROP CONSTRAINT IF EXISTS applications_status_check;

-- Re-add with the two new allowed values
ALTER TABLE public.applications
  ADD CONSTRAINT applications_status_check
  CHECK (status IN ('pending', 'reviewing', 'approved', 'rejected', 'rented', 'sold'));
