import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next')

  if (code) {
    const supabase = createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // If user came from email verification (no explicit next), redirect to login
      // If user has a specific next destination, go there
      if (next) {
        return NextResponse.redirect(`${origin}${next}`)
      }
      // Email verified → redirect to login with success message
      return NextResponse.redirect(`${origin}/login?verified=true`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
}
