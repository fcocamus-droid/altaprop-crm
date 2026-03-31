import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getUserProfile } from '@/lib/auth'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const profile = await getUserProfile()
  if (!profile) return NextResponse.json([], { status: 401 })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return NextResponse.json({ error: 'Missing env' }, { status: 500 })

  try {
    const admin = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Filter by role
    let query = admin
      .from('profiles')
      .select('id, full_name, phone, rut, subscriber_id, created_at')
      .eq('role', 'PROPIETARIO')
      .order('created_at', { ascending: false })

    if (profile.role === 'SUPERADMIN') {
      // SUPERADMIN sees only propietarios assigned to their subscriber
      const subscriberId = profile.subscriber_id || profile.id
      query = query.eq('subscriber_id', subscriberId)
    } else if (profile.role === 'AGENTE') {
      // AGENTE sees propietarios from their subscriber
      if (profile.subscriber_id) {
        query = query.eq('subscriber_id', profile.subscriber_id)
      } else {
        return NextResponse.json([])
      }
    }
    // SUPERADMINBOSS sees ALL (no filter)

    const { data: profiles, error } = await query

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!profiles || profiles.length === 0) return NextResponse.json([])

    // Get emails and metadata
    const { data: authData } = await admin.auth.admin.listUsers({ perPage: 500 })
    const emailMap = new Map<string, string>()
    const metaMap = new Map<string, any>()
    if (authData?.users) {
      for (const u of authData.users) {
        emailMap.set(u.id, u.email || '')
        metaMap.set(u.id, u.user_metadata || {})
      }
    }

    const propietarios = profiles.map(p => {
      const meta = metaMap.get(p.id) || {}
      return {
        id: p.id,
        full_name: p.full_name,
        phone: p.phone,
        rut: p.rut,
        subscriber_id: p.subscriber_id,
        created_at: p.created_at,
        email: emailMap.get(p.id) || '',
        property_address: meta.property_address || '',
        property_city: meta.property_city || '',
        property_sector: meta.property_sector || '',
        property_type: meta.property_type || '',
        property_operation: meta.property_operation || '',
        subscriber_name: '',
      }
    })

    return NextResponse.json(propietarios)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
