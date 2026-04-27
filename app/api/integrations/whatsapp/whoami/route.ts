export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getUserProfile } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { ROLES } from '@/lib/constants'

const GRAPH_URL = 'https://graph.facebook.com/v21.0'

// GET — return the WhatsApp number(s) connected to the calling user.
// Boss sees both their own integration (if any) and the global env-var fallback.
export async function GET() {
  const profile = await getUserProfile()
  if (!profile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = createAdminClient()
  const result: any = { numbers: [] }

  // Per-subscriber integration (any role except postulante)
  const targetId = profile.role === ROLES.SUPERADMIN || profile.role === ROLES.SUPERADMINBOSS
    ? profile.id
    : profile.subscriber_id
  if (targetId) {
    const { data: integration } = await admin
      .from('integrations')
      .select('config, enabled')
      .eq('subscriber_id', targetId)
      .eq('channel', 'whatsapp')
      .maybeSingle()
    if (integration) {
      const c = (integration as any).config
      result.numbers.push({
        source: 'subscriber',
        enabled: integration.enabled,
        phone_number_id: c.phone_number_id,
        display_phone_number: c.display_phone_number || null,
      })
    }
  }

  // Global env-var fallback (Boss inbox)
  if (profile.role === ROLES.SUPERADMINBOSS) {
    const phoneId = process.env.META_WA_PHONE_ID
    const token = process.env.META_WA_TOKEN
    if (phoneId && token) {
      try {
        const res = await fetch(`${GRAPH_URL}/${phoneId}?fields=display_phone_number,verified_name,quality_rating`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        })
        const data = await res.json()
        if (res.ok) {
          result.numbers.push({
            source: 'global',
            enabled: true,
            phone_number_id: phoneId,
            display_phone_number: data.display_phone_number || null,
            verified_name: data.verified_name || null,
            quality_rating: data.quality_rating || null,
          })
        } else {
          result.numbers.push({
            source: 'global',
            phone_number_id: phoneId,
            error: data?.error?.message || `HTTP ${res.status}`,
          })
        }
      } catch (e: any) {
        result.numbers.push({ source: 'global', phone_number_id: phoneId, error: e.message })
      }
    }
  }

  return NextResponse.json(result)
}
