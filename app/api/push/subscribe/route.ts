export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getUserProfile } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'

// POST — register/refresh a Web Push subscription for the current user.
//   body: { endpoint, keys: { p256dh, auth } }
export async function POST(req: Request) {
  const profile = await getUserProfile()
  if (!profile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const sub = await req.json()
  if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
    return NextResponse.json({ error: 'Subscription inválida' }, { status: 400 })
  }

  const admin = createAdminClient()
  const userAgent = req.headers.get('user-agent') || null
  const { error } = await admin
    .from('push_subscriptions')
    .upsert({
      user_id: profile.id,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
      user_agent: userAgent,
      last_used_at: new Date().toISOString(),
    }, { onConflict: 'endpoint' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// DELETE — unsubscribe an endpoint
export async function DELETE(req: Request) {
  const profile = await getUserProfile()
  if (!profile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { endpoint } = await req.json().catch(() => ({}))
  if (!endpoint) return NextResponse.json({ error: 'endpoint requerido' }, { status: 400 })

  const admin = createAdminClient()
  await admin
    .from('push_subscriptions')
    .delete()
    .eq('user_id', profile.id)
    .eq('endpoint', endpoint)

  return NextResponse.json({ ok: true })
}
