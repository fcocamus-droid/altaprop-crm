import { createClient } from '@supabase/supabase-js'
import { getUserProfile } from '@/lib/auth'
import { parseVisitorFromNotes } from '@/lib/utils/visit-pdf'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

export async function GET() {
  const profile = await getUserProfile()
  if (!profile || (profile.role !== 'SUPERADMINBOSS' && profile.role !== 'SUPERADMIN')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  // SUPERADMIN sees only their org. SUPERADMINBOSS sees everything.
  const isBoss = profile.role === 'SUPERADMINBOSS'
  const myScopeId = profile.subscriber_id || profile.id

  try {
    const admin = adminClient()

    // ── Fetch everything in parallel ──────────────────────────────────────────
    let profilesQuery = admin
      .from('profiles')
      .select('id, role, full_name, phone, rut, subscriber_id, created_at, avatar_url')
      .order('created_at', { ascending: false })

    let visitsQuery = admin
      .from('visits')
      .select('id, notes, subscriber_id, scheduled_at, created_at, property:properties(title, city)')
      .order('created_at', { ascending: false })
      .limit(1000)

    let prospectosQuery = admin
      .from('prospectos')
      .select('id, full_name, rut, email, phone, company, tipo, status, subscriber_id, agent_id, created_at')
      .order('created_at', { ascending: false })

    // Scope filtering for SUPERADMIN — only their org's data
    if (!isBoss) {
      // Profiles: those with subscriber_id = me, OR the user themselves (id = me)
      profilesQuery = profilesQuery.or(`subscriber_id.eq.${myScopeId},id.eq.${myScopeId}`)
      visitsQuery = visitsQuery.eq('subscriber_id', myScopeId)
      prospectosQuery = prospectosQuery.eq('subscriber_id', myScopeId)
    }

    const [profilesRes, authRes, visitsRes, prospectosRes] = await Promise.all([
      profilesQuery,
      admin.auth.admin.listUsers({ perPage: 1000 }),
      visitsQuery,
      prospectosQuery,
    ])

    const profiles = profilesRes.data || []
    const authUsers = authRes.data?.users || []
    const prospectos = prospectosRes.data || []
    const visits = visitsRes.data || []

    // Build email & metadata maps from auth
    const emailMap = new Map<string, string>()
    for (const u of authUsers) {
      emailMap.set(u.id, u.email || '')
    }

    // Build subscriber map: id -> { full_name, company_name }
    const subscriberIdSet = new Set<string>()
    profiles.forEach(p => { if (p.subscriber_id) subscriberIdSet.add(p.subscriber_id) })
    prospectos.forEach(p => { if (p.subscriber_id) subscriberIdSet.add(p.subscriber_id) })
    visits.forEach(v => { if ((v as any).subscriber_id) subscriberIdSet.add((v as any).subscriber_id) })
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

    // Visitas → dedupe by email (or phone if no email), take most recent
    const visitorMap = new Map<string, {
      firstVisitId: string
      v: ReturnType<typeof parseVisitorFromNotes>
      subscriberId: string | null
      propertyTitle: string
      propertyCity: string
      scheduledAt: string
      createdAt: string
    }>()
    for (const v of visits as any[]) {
      const parsed = parseVisitorFromNotes(v.notes)
      const key = (parsed.email || parsed.phone || '').toLowerCase().trim()
      if (!key || !parsed.name) continue
      // Keep the most recent visit per visitor
      const existing = visitorMap.get(key)
      if (!existing || new Date(v.created_at) > new Date(existing.createdAt)) {
        visitorMap.set(key, {
          firstVisitId: v.id,
          v: parsed,
          subscriberId: v.subscriber_id || null,
          propertyTitle: v.property?.title || '',
          propertyCity: v.property?.city || '',
          scheduledAt: v.scheduled_at || '',
          createdAt: v.created_at || v.scheduled_at || '',
        })
      }
    }

    const contactsFromVisits = Array.from(visitorMap.entries()).map(([, entry]) => {
      const subscriberInfo = entry.subscriberId ? subscriberMap.get(entry.subscriberId) : null
      return {
        id:              `visita:${entry.firstVisitId}`,
        role:            'VISITA' as string,
        full_name:       entry.v.name || '',
        rut:             entry.v.rut || '',
        email:           entry.v.email || '',
        phone:           entry.v.phone || '',
        empresa:         subscriberInfo?.name || '',
        subscriber_id:   entry.subscriberId || '',
        subscriber_name: subscriberInfo?.name || '',
        avatar_url:      null,
        created_at:      entry.createdAt,
        tipo:            entry.propertyTitle || '',
        city:            entry.propertyCity || '',
        country:         'Chile',
      }
    })

    const contacts = [...contactsFromProfiles, ...contactsFromProspectos, ...contactsFromVisits]

    // ── Stats ─────────────────────────────────────────────────────────────────
    const stats = {
      total:        contacts.length,
      suscriptores: contacts.filter(c => c.role === 'SUPERADMIN').length,
      agentes:      contacts.filter(c => c.role === 'AGENTE').length,
      propietarios: contacts.filter(c => c.role === 'PROPIETARIO').length,
      postulantes:  contacts.filter(c => c.role === 'POSTULANTE').length,
      prospectos:   contacts.filter(c => c.role === 'PROSPECTO').length,
      visitas:      contacts.filter(c => c.role === 'VISITA').length,
    }

    return NextResponse.json({ contacts, stats, currentUserRole: profile.role })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
