-- Migration 030: Add free-form "Nosotros" page content to subscriber profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS website_nosotros_content TEXT;
