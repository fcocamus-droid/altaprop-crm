-- Migration 023: MercadoLibre / Portal Inmobiliario integration
-- On profiles table (per subscriber who connects their ML account)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ml_user_id TEXT,
  ADD COLUMN IF NOT EXISTS ml_access_token TEXT,
  ADD COLUMN IF NOT EXISTS ml_refresh_token TEXT,
  ADD COLUMN IF NOT EXISTS ml_token_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ml_connected_at TIMESTAMPTZ;

-- On properties table (per property published to ML)
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS ml_item_id TEXT,
  ADD COLUMN IF NOT EXISTS ml_status TEXT,
  ADD COLUMN IF NOT EXISTS ml_listing_type TEXT DEFAULT 'silver',
  ADD COLUMN IF NOT EXISTS ml_published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ml_poi_visible BOOLEAN DEFAULT TRUE;
