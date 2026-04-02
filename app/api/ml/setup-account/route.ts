import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { refreshTokenIfNeeded } from '@/lib/ml/client'

const ML_API = 'https://api.mercadolibre.com'

/**
 * GET /api/ml/setup-account
 * Returns the current ML user profile (useful for debugging address_pending)
 *
 * POST /api/ml/setup-account
 * Attempts to patch the ML user's address to resolve `address_pending`
 */

async function getSubscriberToken() {
  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('id, ml_access_token, ml_refresh_token, ml_token_expires_at')
    .not('ml_access_token', 'is', null)
    .limit(1)
    .single()

  if (!profile?.ml_access_token) {
    throw new Error('No ML-connected subscriber found')
  }

  const accessToken = await refreshTokenIfNeeded(
    profile,
    async (tokens) => {
      await admin
        .from('profiles')
        .update({
          ml_access_token: tokens.ml_access_token,
          ml_refresh_token: tokens.ml_refresh_token,
          ml_token_expires_at: tokens.ml_token_expires_at,
        })
        .eq('id', profile.id)
    }
  )

  return accessToken
}

export async function GET() {
  try {
    const accessToken = await getSubscriberToken()

    // Fetch current ML user profile
    const res = await fetch(`${ML_API}/users/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const data = await res.json()

    return NextResponse.json({
      id: data.id,
      nickname: data.nickname,
      email: data.email,
      address: data.address,
      status: data.status,
      tags: data.tags,
      seller_reputation: data.seller_reputation,
      context: data.context,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error inesperado'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const accessToken = await getSubscriberToken()

    // First get user ID
    const meRes = await fetch(`${ML_API}/users/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const meData = await meRes.json()
    const userId = meData.id

    // Try to patch the user address
    // ML requires address fields on the seller profile to allow publishing
    const body = await req.json().catch(() => ({}))
    const addressPayload = body.address || {
      address: 'Av. Providencia 1234',
      zip_code: '7500000',
    }

    const patchRes = await fetch(`${ML_API}/users/${userId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ address: addressPayload }),
    })

    const patchStatus = patchRes.status
    const patchData = await patchRes.json().catch(() => ({}))

    return NextResponse.json({
      userId,
      patchStatus,
      patchData,
      currentProfile: {
        address: meData.address,
        status: meData.status,
        tags: meData.tags,
      },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error inesperado'
    console.error('ML setup-account error:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
