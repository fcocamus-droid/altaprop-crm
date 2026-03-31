-- Migration 017: Allow properties.owner_id to be NULL
-- Needed so admin can unassign a property from a propietario
-- without deleting it from the system.

ALTER TABLE public.properties ALTER COLUMN owner_id DROP NOT NULL;
