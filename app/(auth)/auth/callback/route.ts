import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const next = searchParams.get('next')

  const supabase = createClient()

  // Handle token_hash (from admin generateLink - password recovery)
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as any,
    })
    if (!error) {
      if (next) return NextResponse.redirect(`${origin}${next}`)
      return NextResponse.redirect(`${origin}/dashboard`)
    }
    return NextResponse.redirect(`${origin}/login?error=link_expired`)
  }

  // Handle code (from email verification / standard auth)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      if (next) return NextResponse.redirect(`${origin}${next}`)
      return NextResponse.redirect(`${origin}/login?verified=true`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
}
