import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data: profiles, error } = await admin
      .from('profiles')
      .select('id, full_name, phone, rut, subscriber_id, created_at')
      .eq('role', 'PROPIETARIO')
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const { data: authData } = await admin.auth.admin.listUsers({ perPage: 500 })
    const emailMap = new Map<string, string>()
    const metaMap = new Map<string, any>()
    if (authData?.users) {
      for (const u of authData.users) {
        emailMap.set(u.id, u.email || '')
        metaMap.set(u.id, u.user_metadata || {})
      }
    }

    // Get subscriber names
    const subscriberIds = Array.from(new Set((profiles || []).map(p => p.subscriber_id).filter(Boolean)))
    let subscriberMap = new Map<string, string>()
    if (subscriberIds.length > 0) {
      const { data: subs } = await admin.from('profiles').select('id, full_name').in('id', subscriberIds)
      if (subs) {
        for (const s of subs) subscriberMap.set(s.id, s.full_name || 'Sin nombre')
      }
    }

    const propietarios = (profiles || []).map(p => {
      const meta = metaMap.get(p.id) || {}
      return {
        ...p,
        email: emailMap.get(p.id) || '',
        property_address: meta.property_address || '',
        property_city: meta.property_city || '',
        property_sector: meta.property_sector || '',
        property_type: meta.property_type || '',
        property_operation: meta.property_operation || '',
        subscriber_name: p.subscriber_id ? subscriberMap.get(p.subscriber_id) || '' : '',
      }
    })

    return NextResponse.json(propietarios)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
