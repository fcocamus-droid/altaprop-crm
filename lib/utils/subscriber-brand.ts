/**
 * Shared subscriber branding utility.
 * Used by all email senders so every email within a subscriber's
 * session carries their logo, name, and contact details.
 */

export interface SubscriberBrand {
  name: string        // display name, e.g. "Magnolia Propiedades"
  displayName: string // uppercase version for text headers
  logoUrl: string     // avatar_url from profiles (empty string = no logo)
  phone: string
  email: string       // superadmin auth email
  siteUrl: string     // NEXT_PUBLIC_SITE_URL
  website: string     // siteUrl without protocol
}

export const DEFAULT_BRAND: SubscriberBrand = {
  name: 'Altaprop',
  displayName: 'ALTAPROP',
  logoUrl: '',
  phone: '',
  email: '',
  siteUrl: 'https://altaprop-app.cl',
  website: 'altaprop-app.cl',
}

/**
 * Centred brand header for general emails (approval, finalize, invite, agent).
 * If the subscriber has a logo, shows the image; otherwise shows company name as text.
 */
export function buildSimpleBrandHeader(brand: SubscriberBrand): string {
  if (brand.logoUrl) {
    return `
  <div style="background:#1a2332;padding:24px 40px;text-align:center;">
    <img src="${brand.logoUrl}" alt="${brand.name}"
         style="max-height:52px;max-width:200px;object-fit:contain;display:inline-block;" />
  </div>`
  }
  return `
  <div style="background:#1a2332;padding:28px 40px;text-align:center;">
    <h1 style="color:#c9a84c;margin:0;font-size:26px;font-weight:800;letter-spacing:2px;">${brand.displayName}</h1>
    <p style="color:#6b7f96;margin:4px 0 0;font-size:12px;letter-spacing:1px;text-transform:uppercase;">Gestión Inmobiliaria</p>
  </div>`
}

/**
 * Fetch brand for a subscriber id (SUPERADMIN profile).
 * Requires an admin Supabase client so it can read auth emails.
 * Returns DEFAULT_BRAND if anything is missing.
 */
export async function fetchSubscriberBrand(
  subscriberId: string | null | undefined,
  admin: any, // SupabaseClient (admin)
  siteUrl: string
): Promise<SubscriberBrand> {
  if (!subscriberId) return { ...DEFAULT_BRAND, siteUrl, website: siteUrl.replace(/^https?:\/\//, '') }

  let email = ''
  try {
    const { data } = await admin.auth.admin.getUserById(subscriberId)
    email = data?.user?.email || ''
  } catch {}

  const { data: sub } = await admin
    .from('profiles')
    .select('full_name, avatar_url, phone')
    .eq('id', subscriberId)
    .single()

  if (!sub?.full_name) return { ...DEFAULT_BRAND, email, siteUrl, website: siteUrl.replace(/^https?:\/\//, '') }

  return {
    name: sub.full_name,
    displayName: sub.full_name.toUpperCase(),
    logoUrl: sub.avatar_url || '',
    phone: sub.phone || '',
    email,
    siteUrl,
    website: siteUrl.replace(/^https?:\/\//, ''),
  }
}
