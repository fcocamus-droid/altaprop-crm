import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(
      new URL('/dashboard/configuracion?ml_error=access_denied', request.url)
    )
  }

  try {
    // Exchange the authorization code for tokens
    const tokenRes = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.ML_CLIENT_ID!,
        client_secret: process.env.ML_CLIENT_SECRET!,
        code,
        redirect_uri: process.env.ML_REDIRECT_URI!,
      }).toString(),
    })

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text()
      console.error('ML token exchange failed:', errBody)
      return NextResponse.redirect(
        new URL('/dashboard/configuracion?ml_error=token_exchange', request.url)
      )
    }

    const tokenData = await tokenRes.json()
    const { access_token, refresh_token, expires_in, user_id } = tokenData

    // Get the current authenticated user
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Optionally fetch the ML user info
    let mlUserId = String(user_id)
    try {
      const userRes = await fetch('https://api.mercadolibre.com/users/me', {
        headers: { Authorization: `Bearer ${access_token}` },
      })
      if (userRes.ok) {
        const mlUser = await userRes.json()
        mlUserId = String(mlUser.id)
      }
    } catch {
      // Non-fatal — use user_id from token response
    }

    const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString()

    // Save tokens to profile using admin client (bypasses RLS)
    const admin = createAdminClient()
    const { error: updateError } = await admin
      .from('profiles')
      .update({
        ml_user_id: mlUserId,
        ml_access_token: access_token,
        ml_refresh_token: refresh_token,
        ml_token_expires_at: expiresAt,
        ml_connected_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Failed to save ML tokens:', updateError)
      return NextResponse.redirect(
        new URL('/dashboard/configuracion?ml_error=save_failed', request.url)
      )
    }

    return NextResponse.redirect(
      new URL('/dashboard/configuracion?ml_connected=true', request.url)
    )
  } catch (err) {
    console.error('ML callback error:', err)
    return NextResponse.redirect(
      new URL('/dashboard/configuracion?ml_error=unexpected', request.url)
    )
  }
}
