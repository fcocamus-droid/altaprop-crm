import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    return NextResponse.json({ error: 'Missing env' }, { status: 500 })
  }

  try {
    const admin = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const { data: profiles, error } = await admin
      .from('profiles')
      .select('id, full_name, phone, rut, subscriber_id, created_at')
      .eq('role', 'PROPIETARIO')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message, debug: 'profiles_query' }, { status: 500 })
    }

    if (!profiles || profiles.length === 0) {
      return NextResponse.json([])
    }

    // Get emails and metadata from auth
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
    return NextResponse.json({ error: e.message, stack: e.stack?.slice(0, 200) }, { status: 500 })
  }
}
