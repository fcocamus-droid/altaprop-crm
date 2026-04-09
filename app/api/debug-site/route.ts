import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Temporary debug endpoint — remove after diagnosis
export async function GET(request: NextRequest) {
  const subdomain = request.nextUrl.searchParams.get('subdomain') || 'imcmarket'

  try {
    const admin = createAdminClient()

    // Exact same query as getSubscriberBySubdomain in layout
    const { data: bySubdomainEnabled, error: err1 } = await admin
      .from('profiles')
      .select('id, full_name, website_enabled, website_subdomain, website_domain')
      .eq('website_subdomain', subdomain)
      .eq('website_enabled', true)
      .maybeSingle()

    // Also without the website_enabled filter
    const { data: bySubdomainAny, error: err2 } = await admin
      .from('profiles')
      .select('id, full_name, website_enabled, website_subdomain, website_domain')
      .eq('website_subdomain', subdomain)
      .maybeSingle()

    // Check env vars are set
    const envCheck = {
      has_supabase_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      has_service_role_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      supabase_url_prefix: process.env.NEXT_PUBLIC_SUPABASE_URL?.slice(0, 30),
    }

    return NextResponse.json({
      queried_subdomain: subdomain,
      with_enabled_filter: bySubdomainEnabled,
      error_with_filter: err1?.message,
      without_enabled_filter: bySubdomainAny,
      error_without_filter: err2?.message,
      env: envCheck,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message })
  }
}
