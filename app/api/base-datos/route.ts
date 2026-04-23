import { createClient } from '@supabase/supabase-js'
import { getUserProfile } from '@/lib/auth'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

export async function GET() {
  const profile = await getUserProfile()
  if (!profile || profile.role !== 'SUPERADMINBOSS') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  try {
    const admin = adminClient()

    // ── Fetch everything in parallel ──────────────────────────────────────────
    const [profilesRes, authRes, visitsRes, prospectosRes] = await Promise.all([
      // All profiles (all roles)
      admin
        .from('profiles')
        .select('id, role, full_name, phone, rut, subscriber_id, created_at, avatar_url')
        .order('created_at', { ascending: false }),

      // Auth users for emails
      admin.auth.admin.listUsers({ perPage: 1000 }),

      // Visit requests (may include non-registered visitors)
      admin
        .from('visits')
        .select('id, visitor_id, scheduled_at, property:properties(title, city), visitor:profiles!visits_visitor_id_fkey(id, full_name, phone)')
        .order('created_at', { ascending: false })
        .limit(500),

      // Prospectos (CRM leads — not registered users)
      admin
        .from('prospectos')
        .select('id, full_name, rut, email, phone, company, tipo, status, subscriber_id, agent_id, created_at')
        .order('created_at', { ascending: false }),
    ])

    const profiles = profilesRes.data || []
    const authUsers = authRes.data?.users || []
    const prospectos = prospectosRes.data || []

    // Build email & metadata maps from auth
    const emailMap = new Map<string, string>()
    for (const u of authUsers) {
      emailMap.set(u.id, u.email || '')
    }

    // Build subscriber map: id -> { full_name, company_name }
    const subscriberIdSet = new Set<string>()
    profiles.forEach(p => { if (p.subscriber_id) subscriberIdSet.add(p.subscriber_id) })
    prospectos.forEach(p => { if (p.subscriber_id) subscriberIdSet.add(p.subscriber_id) })
    const subscriberIds = Array.from(subscriberIdSet)
    const subscriberMap = new Map<string, { name: string }>()

    if (subscriberIds.length > 0) {
      const { data: subs } = await admin
        .from('profiles')
        .select('id, full_name')
        .in('id', subscriberIds)
      if (subs) subs.forEach(s => subscriberMap.set(s.id, { name: s.full_name || '' }))
    }

    // Also include subscribers themselves
    const subscriberProfiles = profiles.filter(p => p.role === 'SUPERADMIN')

    // ── Build unified contacts list ────────────────────────────────────────────
    const contactsFromProfiles = profiles.map(p => {
      const subscriberInfo = p.subscriber_id ? subscriberMap.get(p.subscriber_id) : null
      const isSuperAdmin = p.role === 'SUPERADMIN'

      return {
        id:              p.id,
        role:            p.role as string,
        full_name:       p.full_name || '',
        rut:             p.rut || '',
        email:           emailMap.get(p.id) || '',
        phone:           p.phone || '',
        // Empresa: for SUPERADMIN it's themselves; for others it's their subscriber
        empresa:         isSuperAdmin ? (p.full_name || '') : (subscriberInfo?.name || ''),
        subscriber_id:   p.subscriber_id || (isSuperAdmin ? p.id : ''),
        subscriber_name: isSuperAdmin ? (p.full_name || '') : (subscriberInfo?.name || ''),
        avatar_url:      p.avatar_url || null,
        created_at:      p.created_at,
        tipo:            '',
        city:            '',
        country:         'Chile',
      }
    })

    // Prospectos → unified contact format (role = 'PROSPECTO')
    const contactsFromProspectos = prospectos.map(pr => {
      const subscriberInfo = pr.subscriber_id ? subscriberMap.get(pr.subscriber_id) : null
      return {
        id:              `prospecto:${pr.id}`,
        role:            'PROSPECTO' as string,
        full_name:       pr.full_name || '',
        rut:             pr.rut || '',
        email:           pr.email || '',
        phone:           pr.phone || '',
        empresa:         pr.company || subscriberInfo?.name || '',
        subscriber_id:   pr.subscriber_id || '',
        subscriber_name: subscriberInfo?.name || '',
        avatar_url:      null,
        created_at:      pr.created_at,
        tipo:            pr.tipo || '',
        city:            '',
        country:         'Chile',
      }
    })

    const contacts = [...contactsFromProfiles, ...contactsFromProspectos]

    // ── Stats ─────────────────────────────────────────────────────────────────
    const stats = {
      total:        contacts.length,
      suscriptores: contacts.filter(c => c.role === 'SUPERADMIN').length,
      agentes:      contacts.filter(c => c.role === 'AGENTE').length,
      propietarios: contacts.filter(c => c.role === 'PROPIETARIO').length,
      postulantes:  contacts.filter(c => c.role === 'POSTULANTE').length,
      prospectos:   contacts.filter(c => c.role === 'PROSPECTO').length,
    }

    return NextResponse.json({ contacts, stats })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
