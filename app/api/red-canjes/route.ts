import { createClient } from '@supabase/supabase-js'
import { getUserProfile } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const profile = await getUserProfile()
  if (!profile) return NextResponse.json([], { status: 401 })

  const allowedRoles = ['SUPERADMIN', 'AGENTE', 'SUPERADMINBOSS']
  if (!allowedRoles.includes(profile.role)) {
    return NextResponse.json([], { status: 403 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return NextResponse.json({ error: 'Missing env' }, { status: 500 })

  const { searchParams } = new URL(request.url)
  const filterRegion = searchParams.get('region') || ''
  const filterCity = searchParams.get('city') || ''
  const filterOperation = searchParams.get('operation') || ''
  const filterType = searchParams.get('type') || ''
  const filterStatus = searchParams.get('status') || ''

  try {
    const admin = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Step 1: get all PROPIETARIO profiles
    const { data: propietarios, error: propError } = await admin
      .from('profiles')
      .select('id, full_name, phone, rut, subscriber_id, created_at')
      .eq('role', 'PROPIETARIO')
      .order('created_at', { ascending: false })

    if (propError) return NextResponse.json({ error: propError.message }, { status: 500 })
    if (!propietarios || propietarios.length === 0) return NextResponse.json([])

    const propietarioIds = propietarios.map((p: any) => p.id)

    // Step 2: get emails & metadata from auth
    const { data: authData } = await admin.auth.admin.listUsers({ perPage: 1000 })
    const emailMap = new Map<string, string>()
    const metaMap = new Map<string, any>()
    if (authData?.users) {
      for (const u of authData.users) {
        emailMap.set(u.id, u.email || '')
        metaMap.set(u.id, u.user_metadata || {})
      }
    }

    // Step 3: get properties owned by propietarios that are visible in Red de Canjes
    let propQuery = admin
      .from('properties')
      .select('id, title, address, city, sector, region, status, operation, type, price, currency, owner_id, created_at, red_canjes_visible, images:property_images(url)')
      .in('owner_id', propietarioIds)
      .eq('red_canjes_visible', true)
      .order('created_at', { ascending: false })

    if (filterRegion) propQuery = propQuery.ilike('region', `%${filterRegion}%`)
    if (filterCity) propQuery = propQuery.ilike('city', `%${filterCity}%`)
    if (filterOperation) propQuery = propQuery.eq('operation', filterOperation)
    if (filterType) propQuery = propQuery.eq('type', filterType)
    if (filterStatus) propQuery = propQuery.eq('status', filterStatus)

    const { data: properties, error: propErr } = await propQuery
    if (propErr) return NextResponse.json({ error: propErr.message }, { status: 500 })

    // Step 4: get all active claims — keyed by property_id (per-property) or propietario_id (meta-only)
    type ClaimInfo = { subscriber_name: string; claimed_by_name: string; expires_at: string; is_mine: boolean }
    const claimsMapByProperty = new Map<string, ClaimInfo>()
    const claimsMapByPropietario = new Map<string, ClaimInfo>()
    try {
      // Auto-cleanup: batch-expire any claims whose expires_at has passed
      // First fetch them so we can restore each property's original subscriber_id
      const now = new Date().toISOString()
      const { data: expiring } = await admin
        .from('red_canjes_claims')
        .select('id, property_id, original_subscriber_id')
        .eq('status', 'active')
        .lt('expires_at', now)

      if (expiring && expiring.length > 0) {
        // Restore subscriber_id for each property before expiring
        for (const c of expiring) {
          if (c.property_id) {
            await admin
              .from('properties')
              .update({ subscriber_id: c.original_subscriber_id ?? null })
              .eq('id', c.property_id)
          }
        }
        // Now mark all as expired
        await admin
          .from('red_canjes_claims')
          .update({ status: 'expired' })
          .in('id', expiring.map((c: any) => c.id))
      }

      const subscriberId = profile.role === 'SUPERADMINBOSS' ? profile.id : (profile.subscriber_id || profile.id)
      const { data: claims } = await admin
        .from('red_canjes_claims')
        .select('propietario_id, property_id, subscriber_id, subscriber_name, claimed_by_name, expires_at')
        .eq('status', 'active')

      if (claims) {
        for (const c of claims) {
          const info: ClaimInfo = {
            subscriber_name: c.subscriber_name || '',
            claimed_by_name: c.claimed_by_name || '',
            expires_at: c.expires_at,
            is_mine: c.subscriber_id === subscriberId,
          }
          if (c.property_id) {
            claimsMapByProperty.set(c.property_id, info)
          } else {
            claimsMapByPropietario.set(c.propietario_id, info)
          }
        }
      }
    } catch {
      // Table may not exist yet — claims feature is optional
    }

    // Build propietario map
    const propietarioMap = new Map<string, any>()
    for (const p of propietarios) {
      const meta = metaMap.get(p.id) || {}
      propietarioMap.set(p.id, {
        id: p.id,
        full_name: p.full_name || 'Sin nombre',
        phone: p.phone || meta.phone || '',
        rut: p.rut || '',
        email: emailMap.get(p.id) || '',
        subscriber_id: p.subscriber_id,
        created_at: p.created_at,
        property_city: meta.property_city || '',
        property_sector: meta.property_sector || '',
        property_type: meta.property_type || '',
        property_operation: meta.property_operation || '',
      })
    }

    // Listings from actual properties (filtered)
    const propertiesWithOwner = (properties || []).map((prop: any) => {
      const claim = claimsMapByProperty.get(prop.id) || null
      return {
        ...prop,
        propietario: propietarioMap.get(prop.owner_id) || null,
        pais: 'Chile',
        claim,
      }
    })

    // Build the set of owners who have ANY property (regardless of status/filters)
    // so we don't show metadata-only cards for propietarios whose properties were
    // filtered out (e.g. rented/unavailable properties excluded by status filter)
    const { data: allPropOwners } = await admin
      .from('properties')
      .select('owner_id')
      .in('owner_id', propietarioIds)
    const ownersWithProperty = new Set((allPropOwners || []).map((p: any) => p.owner_id))
    const metaOnlyListings = propietarios
      .filter((p: any) => !ownersWithProperty.has(p.id))
      .map((p: any) => {
        const meta = metaMap.get(p.id) || {}
        const matchesCity = !filterCity || (meta.property_city || '').toLowerCase().includes(filterCity.toLowerCase())
        const matchesOp = !filterOperation || meta.property_operation === filterOperation
        const matchesType = !filterType || meta.property_type === filterType
        if (!matchesCity || !matchesOp || !matchesType) return null
        const claim = claimsMapByPropietario.get(p.id) || null
        return {
          id: `meta_${p.id}`,
          title: `Propiedad en ${meta.property_city || 'Chile'}`,
          address: meta.property_address || '',
          city: meta.property_city || '',
          sector: meta.property_sector || '',
          region: '',
          status: 'available',
          operation: meta.property_operation || '',
          type: meta.property_type || '',
          price: null,
          currency: null,
          owner_id: p.id,
          created_at: p.created_at,
          images: [],
          pais: 'Chile',
          is_metadata_only: true,
          propietario: propietarioMap.get(p.id) || null,
          claim,
        }
      })
      .filter(Boolean)

    // Step 5: fetch staff (non-PROPIETARIO) properties explicitly published to Red de Canjes
    let staffQuery = admin
      .from('properties')
      .select('id, title, address, city, sector, region, status, operation, type, price, currency, owner_id, subscriber_id, created_at, red_canjes_visible, images:property_images(url)')
      .eq('red_canjes_visible', true)
      .eq('status', 'available')

    if (propietarioIds.length > 0) {
      staffQuery = staffQuery.not('owner_id', 'in', `(${propietarioIds.join(',')})`)
    }

    if (filterRegion) staffQuery = staffQuery.ilike('region', `%${filterRegion}%`)
    if (filterCity) staffQuery = staffQuery.ilike('city', `%${filterCity}%`)
    if (filterOperation) staffQuery = staffQuery.eq('operation', filterOperation)
    if (filterType) staffQuery = staffQuery.eq('type', filterType)

    const { data: staffProperties } = await staffQuery

    const staffListings = (staffProperties || []).map((prop: any) => ({
      ...prop,
      propietario: null,
      pais: 'Chile',
      claim: null,
      is_staff_listing: true,
    }))

    const result = [...propertiesWithOwner, ...metaOnlyListings, ...staffListings]

    return NextResponse.json(result)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
