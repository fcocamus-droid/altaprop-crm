import { cache } from 'react'
import { createAdminClient } from '@/lib/supabase/admin'

const PROFILE_SELECT =
  'id, full_name, avatar_url, website_enabled, website_subdomain, website_domain, ' +
  'website_primary_color, website_accent_color, website_hero_title, website_hero_subtitle, ' +
  'website_about_text, website_whatsapp, phone'

type SubscriberRow = {
  id: string
  full_name: string | null
  avatar_url: string | null
  website_enabled: boolean | null
  website_subdomain: string | null
  website_domain: string | null
  website_primary_color: string | null
  website_accent_color: string | null
  website_hero_title: string | null
  website_hero_subtitle: string | null
  website_about_text: string | null
  website_whatsapp: string | null
  phone: string | null
}

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

  let profile = bySubdomain as SubscriberRow | null

  if (!profile) {
    const { data: byDomain } = await admin
      .from('profiles')
      .select(PROFILE_SELECT)
      .eq('website_domain', subdomain)
      .maybeSingle()
    profile = byDomain as SubscriberRow | null
  }

  if (!profile) return null

  const { data: authUser } = await admin.auth.admin.getUserById(profile.id)
  return { ...profile, email: authUser?.user?.email ?? null }
})
