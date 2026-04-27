export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const GRAPH_URL = 'https://graph.facebook.com/v21.0'

// POST — one-shot setup endpoint. Authorized by SUPABASE_SERVICE_ROLE_KEY in
// the Authorization header (so it's callable from a trusted ops shell, not
// from any browser session).
//
// Body: { phone_number_id, subscriber_id }
//
// Reads the global META_WA_* env vars, validates the phone_number_id with
// Meta, then upserts an integrations row scoped to the given subscriber and
// idempotently subscribes the app to the WABA.
export async function POST(req: Request) {
  const auth = req.headers.get('authorization')
  const expected = `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
  if (!auth || auth !== expected) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const phoneNumberId = String(body?.phone_number_id || '').trim()
  const subscriberId = String(body?.subscriber_id || '').trim()

  if (!phoneNumberId || !subscriberId) {
    return NextResponse.json({ error: 'phone_number_id y subscriber_id requeridos' }, { status: 400 })
  }

  const wabaId = process.env.META_WA_WABA_ID
  const token = process.env.META_WA_TOKEN
  const appSecret = process.env.META_WA_APP_SECRET

  if (!wabaId || !token) {
    return NextResponse.json({
      error: 'META_WA_WABA_ID o META_WA_TOKEN no están configurados en el entorno',
    }, { status: 500 })
  }

  // 1. Verify the phone number with Meta — proves the token has access to it
  const verifyRes = await fetch(
    `${GRAPH_URL}/${phoneNumberId}?fields=display_phone_number,verified_name,quality_rating`,
    { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' },
  )
  const verifyData = await verifyRes.json().catch(() => ({}))
  if (!verifyRes.ok) {
    return NextResponse.json({
      error: verifyData?.error?.message || `HTTP ${verifyRes.status}`,
    }, { status: 400 })
  }

  // 2. Subscribe the app to the WABA (idempotent — Meta returns success even
  //    when already subscribed)
  let subscribed = false
  try {
    const subRes = await fetch(`${GRAPH_URL}/${wabaId}/subscribed_apps`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    subscribed = subRes.ok
  } catch { /* best-effort */ }

  // 3. Upsert the integration row
  const admin = createAdminClient()
  const { data: row, error } = await admin
    .from('integrations')
    .upsert(
      {
        subscriber_id: subscriberId,
        channel: 'whatsapp',
        enabled: true,
        config: {
          phone_number_id: phoneNumberId,
          waba_id: wabaId,
          access_token: token,
          app_secret: appSecret || null,
          display_phone_number: verifyData.display_phone_number || null,
          verified_name: verifyData.verified_name || null,
        },
        last_verified_at: new Date().toISOString(),
      },
      { onConflict: 'subscriber_id,channel' },
    )
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    ok: true,
    integration_id: row.id,
    display_phone_number: verifyData.display_phone_number || null,
    verified_name: verifyData.verified_name || null,
    quality_rating: verifyData.quality_rating || null,
    waba_subscribed: subscribed,
  })
}
