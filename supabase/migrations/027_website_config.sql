-- 027: Subscriber website configuration
-- Each SUPERADMIN can configure their own public-facing property listing website

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS website_subdomain      TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS website_domain         TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS website_enabled        BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS website_primary_color  TEXT NOT NULL DEFAULT '#1a2332',
  ADD COLUMN IF NOT EXISTS website_accent_color   TEXT NOT NULL DEFAULT '#c9a84c',
  ADD COLUMN IF NOT EXISTS website_hero_title     TEXT,
  ADD COLUMN IF NOT EXISTS website_hero_subtitle  TEXT,
  ADD COLUMN IF NOT EXISTS website_about_text     TEXT,
  ADD COLUMN IF NOT EXISTS website_whatsapp       TEXT;

-- Reserve common subdomains so they can't be taken by subscribers
-- (www, api, admin, app, dashboard, login, register handled in app-layer validation)

-- Index for fast subdomain/domain lookups in middleware
CREATE INDEX IF NOT EXISTS idx_profiles_website_subdomain ON profiles (website_subdomain) WHERE website_subdomain IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_website_domain    ON profiles (website_domain)    WHERE website_domain    IS NOT NULL;
