export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getUserProfile } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { ROLES } from '@/lib/constants'

const GRAPH_URL = 'https://graph.facebook.com/v21.0'

interface MetaTemplateComponent {
  type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS'
  format?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT'
  text?: string
  example?: any
  buttons?: any[]
}

interface MetaTemplate {
  name: string
  status: 'APPROVED' | 'PENDING' | 'REJECTED' | 'DISABLED'
  language: string
  category: string
  components: MetaTemplateComponent[]
}

// Resolve which subscriber's templates we can read.
async function resolveCreds(profile: any, admin: ReturnType<typeof createAdminClient>, subscriberIdParam: string | null) {
  // Boss can query any subscriber by ?subscriber_id=...
  let targetId: string | null = null
  if (profile.role === ROLES.SUPERADMINBOSS) {
    targetId = subscriberIdParam || null
  } else if (profile.role === ROLES.SUPERADMIN) {
    targetId = profile.subscriber_id || profile.id
  } else if (profile.role === ROLES.AGENTE) {
    targetId = profile.subscriber_id || null
  }

  if (targetId) {
    const { data: integration } = await admin
      .from('integrations')
      .select('config, enabled')
      .eq('subscriber_id', targetId)
      .eq('channel', 'whatsapp')
      .eq('enabled', true)
      .maybeSingle()
    if (integration) {
      const c = (integration as any).config
      return { wabaId: c.waba_id as string, token: c.access_token as string }
    }
  }

  // Fallback to global creds (Boss inbox)
  if (profile.role === ROLES.SUPERADMINBOSS) {
    const wabaId = process.env.META_WA_WABA_ID
    const token = process.env.META_WA_TOKEN
    if (wabaId && token) return { wabaId, token }
  }
  return null
}

// GET — list approved WhatsApp templates for the calling subscriber.
//   Boss can pass ?subscriber_id=... to query a specific tenant's templates;
//   defaults to the global WABA if omitted.
export async function GET(req: Request) {
  const profile = await getUserProfile()
  if (!profile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = createAdminClient()
  const { searchParams } = new URL(req.url)
  const subscriberIdParam = searchParams.get('subscriber_id')

  const creds = await resolveCreds(profile, admin, subscriberIdParam)
  if (!creds) {
    return NextResponse.json({ templates: [], error: 'WhatsApp no configurado' })
  }

  try {
    const url = `${GRAPH_URL}/${creds.wabaId}/message_templates?fields=name,status,language,category,components&limit=100`
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${creds.token}` },
      cache: 'no-store',
    })
    const data = await res.json()
    if (!res.ok) {
      return NextResponse.json({
        templates: [],
        error: data?.error?.message || `HTTP ${res.status}`,
      }, { status: 200 })
    }
    const list = (data.data as MetaTemplate[]) || []
    // Only approved ones are sendable
    const approved = list.filter(t => t.status === 'APPROVED')
    return NextResponse.json({ templates: approved })
  } catch (e: any) {
    return NextResponse.json({ templates: [], error: e.message }, { status: 200 })
  }
}
