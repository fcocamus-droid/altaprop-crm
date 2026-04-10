import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code      = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type      = searchParams.get('type')
  const next      = searchParams.get('next')
  const property  = searchParams.get('property') // propertyId for auto-apply after verification

  const supabase = createClient()

  // Handle token_hash (password recovery via admin generateLink)
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: type as any })
    if (!error) {
      if (next) return NextResponse.redirect(`${origin}${next}`)
      return NextResponse.redirect(`${origin}/dashboard`)
    }
    return NextResponse.redirect(`${origin}/login?error=link_expired`)
  }

  // Handle code (email verification / standard auth)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Auto-create application when postulante registered from a property page
      if (property) {
        await autoCreateApplication(supabase, property)
      }
      if (next) return NextResponse.redirect(`${origin}${next}`)
      return NextResponse.redirect(`${origin}/login?verified=true`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
}

async function autoCreateApplication(
  supabase: ReturnType<typeof createClient>,
  propertyId: string,
) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const admin = createAdminClient()

    const [{ data: property }] = await Promise.all([
      admin.from('properties').select('id, title, address, subscriber_id').eq('id', propertyId).single(),
    ])
    if (!property) return

    // Guard against duplicates
    const { data: existing } = await admin
      .from('applications')
      .select('id')
      .eq('property_id', propertyId)
      .eq('applicant_id', user.id)
      .maybeSingle()

    if (existing) return

    await admin.from('applications').insert({
      property_id:   propertyId,
      applicant_id:  user.id,
      subscriber_id: property.subscriber_id,
      status:        'pending',
    })
  } catch (err) {
    console.error('auto-create application error:', err)
  }
}
