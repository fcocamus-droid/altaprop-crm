import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Temporary debug endpoint — remove after diagnosis
export async function GET(request: NextRequest) {
  const subdomain = request.nextUrl.searchParams.get('subdomain') || 'imcmarket'

  try {
    const admin = createAdminClient()

    // Check if website_subdomain column exists by querying it
    const { data: bySubdomain, error: err1 } = await admin
      .from('profiles')
      .select('id, full_name, website_enabled, website_subdomain, website_domain')
      .eq('website_subdomain', subdomain)
      .maybeSingle()

    // Also check profiles with website_enabled = true
    const { data: enabledProfiles, error: err2 } = await admin
      .from('profiles')
      .select('id, full_name, website_enabled, website_subdomain')
      .eq('website_enabled', true)
      .limit(10)

    return NextResponse.json({
      queried_subdomain: subdomain,
      found_by_subdomain: bySubdomain,
      error_subdomain: err1?.message,
      enabled_profiles: enabledProfiles,
      error_enabled: err2?.message,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message })
  }
}
