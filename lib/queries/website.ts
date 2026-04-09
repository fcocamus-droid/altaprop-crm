import { cache } from 'react'
import { createAdminClient } from '@/lib/supabase/admin'

const PROFILE_SELECT =
  'id, full_name, avatar_url, website_enabled, website_subdomain, website_domain, ' +
  'website_primary_color, website_accent_color, website_hero_title, website_hero_subtitle, ' +
  'website_about_text, website_whatsapp, phone'

/**
 * Looks up a subscriber profile by subdomain (e.g. "magnolia") or custom domain
 * (e.g. "globalcomex.cl"). Wrapped with React.cache() so layout, page, and
 * generateMetadata share a single DB round-trip per request instead of each
 * making their own queries.
 */
export const getSubscriberProfile = cache(async (subdomain: string) => {
  const admin = createAdminClient()

  const { data: bySubdomain } = await admin
    .from('profiles')
    .select(PROFILE_SELECT)
    .eq('website_subdomain', subdomain)
    .maybeSingle()

  let profile = bySubdomain

  if (!profile) {
    const { data: byDomain } = await admin
      .from('profiles')
      .select(PROFILE_SELECT)
      .eq('website_domain', subdomain)
      .maybeSingle()
    profile = byDomain
  }

  if (!profile) return null

  const { data: authUser } = await admin.auth.admin.getUserById(profile.id)
  return { ...profile, email: authUser?.user?.email ?? null }
})
