export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getUserProfile } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { ROLES } from '@/lib/constants'

// Each subscriber stores their own WhatsApp integration in `integrations.config`:
// {
//   phone_number_id: "...",
//   waba_id: "...",
//   access_token: "...",        // long-lived / system-user token
//   app_secret: "...",          // optional, for webhook signature verification
//   display_phone_number: "..." // for UI only
// }

function scopeId(profile: any): string | null {
  if (profile.role === ROLES.SUPERADMIN || profile.role === ROLES.SUPERADMINBOSS) return profile.id
  return null
}

function maskToken(t: string | undefined | null): string {
  if (!t) return ''
  if (t.length <= 8) return '••••'
  return t.substring(0, 4) + '••••••••' + t.substring(t.length - 4)
}

// GET — load current integration (token masked)
export async function GET() {
  const profile = await getUserProfile()
  if (!profile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const id = scopeId(profile)
  if (!id) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const admin = createAdminClient()
  const { data } = await admin
    .from('integrations')
    .select('*')
    .eq('subscriber_id', id)
    .eq('channel', 'whatsapp')
    .maybeSingle()

  if (!data) {
    return NextResponse.json({ integration: null })
  }
  const cfg = data.config as Record<string, any>
  return NextResponse.json({
    integration: {
      id: data.id,
      enabled: data.enabled,
      last_verified_at: data.last_verified_at,
      created_at: data.created_at,
      config: {
        phone_number_id: cfg.phone_number_id || '',
        waba_id: cfg.waba_id || '',
        display_phone_number: cfg.display_phone_number || '',
        access_token_preview: maskToken(cfg.access_token),
        app_secret_preview: maskToken(cfg.app_secret),
        has_token: !!cfg.access_token,
        has_app_secret: !!cfg.app_secret,
      },
    },
  })
}

// POST — save/upsert integration. If body.test === true, only test the credentials.
export async function POST(req: Request) {
  const profile = await getUserProfile()
  if (!profile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const id = scopeId(profile)
  if (!id) return NextResponse.json({ error: 'Solo Suscriptores pueden configurar' }, { status: 403 })

  const body = await req.json()
  const phoneId = String(body.phone_number_id || '').trim()
  const wabaId  = String(body.waba_id || '').trim()
  const token   = String(body.access_token || '').trim()
  const appSecret = String(body.app_secret || '').trim()
  const displayPhone = String(body.display_phone_number || '').trim()

  if (!phoneId || !token) {
    return NextResponse.json({ error: 'Phone Number ID y Access Token son obligatorios' }, { status: 400 })
  }

  // Test the credentials against Meta Graph API
  const testRes = await fetch(`https://graph.facebook.com/v21.0/${phoneId}?fields=display_phone_number,verified_name,quality_rating`, {
    headers: { 'Authorization': `Bearer ${token}` },
  })
  const testData = await testRes.json().catch(() => ({}))

  if (!testRes.ok) {
    return NextResponse.json({
      error: 'Las credenciales no son válidas',
      detail: testData?.error?.message || `HTTP ${testRes.status}`,
    }, { status: 400 })
  }

  // If body.test only — return result, don't save
  if (body.test === true) {
    return NextResponse.json({
      success: true,
      verified: {
        display_phone_number: testData.display_phone_number,
        verified_name: testData.verified_name,
        quality_rating: testData.quality_rating,
      },
    })
  }

  // Check phone_number_id is unique across subscribers (one phone = one tenant)
  const admin = createAdminClient()
  const { data: existing } = await admin
    .from('integrations')
    .select('id, subscriber_id')
    .eq('channel', 'whatsapp')
    .neq('subscriber_id', id)

  const conflict = (existing || []).find(i => {
    const c = (i as any).config as any
    return c?.phone_number_id === phoneId
  })
  if (conflict) {
    return NextResponse.json({ error: 'Este número de WhatsApp ya está conectado a otra organización' }, { status: 409 })
  }

  // Upsert
  const { data, error } = await admin
    .from('integrations')
    .upsert({
      subscriber_id: id,
      channel: 'whatsapp',
      config: {
        phone_number_id: phoneId,
        waba_id: wabaId,
        access_token: token,
        app_secret: appSecret || undefined,
        display_phone_number: displayPhone || testData.display_phone_number || '',
      },
      enabled: true,
      last_verified_at: new Date().toISOString(),
    }, { onConflict: 'subscriber_id,channel' })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Subscribe app to WABA (idempotent — Meta returns success even if already subscribed)
  if (wabaId) {
    fetch(`https://graph.facebook.com/v21.0/${wabaId}/subscribed_apps`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
    }).catch(() => {})
  }

  return NextResponse.json({
    success: true,
    integration_id: data.id,
    verified: {
      display_phone_number: testData.display_phone_number,
      verified_name: testData.verified_name,
    },
  })
}

// DELETE — disconnect integration
export async function DELETE() {
  const profile = await getUserProfile()
  if (!profile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const id = scopeId(profile)
  if (!id) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const admin = createAdminClient()
  const { error } = await admin
    .from('integrations')
    .delete()
    .eq('subscriber_id', id)
    .eq('channel', 'whatsapp')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
