-- 028: Add website_visible flag to properties
-- Controls whether a property appears on the subscriber's public website.
-- Defaults to true so all existing properties remain visible without any action.

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS website_visible BOOLEAN NOT NULL DEFAULT true;

-- Composite index for the public site query: subscriber_id + visible + status
CREATE INDEX IF NOT EXISTS idx_properties_website_visible
  ON properties (subscriber_id, website_visible, status);

COMMENT ON COLUMN properties.website_visible IS
  'When false, the property is hidden from the subscriber public website (app/site/[subdomain]).';
