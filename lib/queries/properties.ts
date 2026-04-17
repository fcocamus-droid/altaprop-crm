import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import type { Property, PropertyFilters } from '@/types'

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createAdminClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
}

/**
 * Returns a set of property IDs that are currently under an active Red de Canjes claim.
 * Fetches all active claims at once — the table is small (max 3 per subscriber),
 * so a full scan is fast and lets us run this in parallel with the properties query.
 */
async function getActiveClaimedIds(): Promise<Set<string>> {
  try {
    const admin = getAdminClient()
    const { data: claims } = await admin
      .from('red_canjes_claims')
      .select('property_id')
      .eq('status', 'active')
      .not('property_id', 'is', null)
    return new Set((claims || []).map((c: any) => c.property_id as string))
  } catch {
    return new Set()
  }
}

export async function getProperties(filters: PropertyFilters = {}) {
  const supabase = createClient()
  let query = supabase
    .from('properties')
    .select('*, images:property_images(url), owner:profiles!properties_owner_id_fkey(full_name, phone)')
    .order('created_at', { ascending: false })

  if (filters.type) query = query.eq('type', filters.type)
  if (filters.operation) query = query.eq('operation', filters.operation)
  if (filters.city) query = query.ilike('city', `%${filters.city}%`)
  if (filters.sector) query = query.ilike('sector', `%${filters.sector}%`)
  if (filters.minPrice) query = query.gte('price', filters.minPrice)
  if (filters.maxPrice) query = query.lte('price', filters.maxPrice)
  if (filters.bedrooms) query = query.gte('bedrooms', filters.bedrooms)
  if (filters.status) query = query.eq('status', filters.status)
  else query = query.eq('status', 'available')

  const { data, error } = await query
  if (error) throw error
  return (data || []) as Property[]
}

export async function getPropertyById(id: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('properties')
    .select('*, images:property_images(*), owner:profiles!properties_owner_id_fkey(id, full_name, phone, avatar_url)')
    .eq('id', id)
    .single()

  if (error) return null
  return data as Property
}

export async function getPropertiesByOwner(ownerId: string) {
  // Use admin client to bypass RLS — propietario needs to see agent profile data
  const admin = getAdminClient()
  const { data, error } = await admin
    .from('properties')
    .select('*, images:property_images(url), agent:profiles!properties_agent_id_fkey(id, full_name), ownerProfile:profiles!properties_owner_id_fkey(role)')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return ((data || []) as any[]).map(p => ({ ...p, owner_role: p.ownerProfile?.role || null })) as Property[]
}

export async function getPropertiesByAgent(agentId: string) {
  const supabase = createClient()

  // Run properties + active claims in parallel
  const [{ data, error }, claimedIds] = await Promise.all([
    supabase
      .from('properties')
      .select('*, images:property_images(url), owner:profiles!properties_owner_id_fkey(full_name, role), agent:profiles!properties_agent_id_fkey(id, full_name)')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false }),
    getActiveClaimedIds(),
  ])

  if (error) throw error
  return ((data || []) as any[]).map(p => ({
    ...p,
    owner_role: (p.owner as any)?.role || null,
    has_active_red_canjes_claim: claimedIds.has(p.id),
  })) as Property[]
}

export async function getAllProperties() {
  const supabase = createClient()

  // Run properties + active claims in parallel
  const [{ data, error }, claimedIds] = await Promise.all([
    supabase
      .from('properties')
      .select('*, images:property_images(url), owner:profiles!properties_owner_id_fkey(full_name, role), agent:profiles!properties_agent_id_fkey(id, full_name)')
      .order('created_at', { ascending: false }),
    getActiveClaimedIds(),
  ])

  if (error) throw error
  return ((data || []) as any[]).map(p => ({
    ...p,
    owner_role: (p.owner as any)?.role || null,
    has_active_red_canjes_claim: claimedIds.has(p.id),
  })) as Property[]
}

export async function getPropertiesBySubscriber(subscriberId: string) {
  const supabase = createClient()

  // Run properties + active claims in parallel
  const [{ data, error }, claimedIds] = await Promise.all([
    supabase
      .from('properties')
      .select('*, images:property_images(url), owner:profiles!properties_owner_id_fkey(full_name, role), agent:profiles!properties_agent_id_fkey(id, full_name)')
      .eq('subscriber_id', subscriberId)
      .order('created_at', { ascending: false }),
    getActiveClaimedIds(),
  ])

  if (error) throw error
  return ((data || []) as any[]).map(p => ({
    ...p,
    owner_role: (p.owner as any)?.role || null,
    has_active_red_canjes_claim: claimedIds.has(p.id),
  })) as Property[]
}

export async function getFeaturedProperties() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('properties')
    .select('*, images:property_images(url)')
    .eq('status', 'available')
    .eq('featured', true)
    .order('created_at', { ascending: false })
    .limit(6)

  if (error) throw error
  return (data || []) as Property[]
}

export async function getPropertyStatsByAgent(agentId: string) {
  const supabase = createClient()
  const { data, error } = await supabase.from('properties').select('status').eq('agent_id', agentId)
  if (error) return { total: 0, available: 0, reserved: 0, rented: 0, sold: 0 }
  const items = data || []
  return {
    total: items.length,
    available: items.filter(p => p.status === 'available').length,
    reserved: items.filter(p => p.status === 'reserved').length,
    rented: items.filter(p => p.status === 'rented').length,
    sold: items.filter(p => p.status === 'sold').length,
  }
}

export async function getPropertyStats(ownerId?: string, subscriberId?: string) {
  const supabase = createClient()
  let query = supabase.from('properties').select('status')
  if (subscriberId) query = query.eq('subscriber_id', subscriberId)
  else if (ownerId) query = query.eq('owner_id', ownerId)

  const { data, error } = await query
  if (error) return { total: 0, available: 0, reserved: 0, rented: 0, sold: 0 }

  const items = data || []
  return {
    total: items.length,
    available: items.filter(p => p.status === 'available').length,
    reserved: items.filter(p => p.status === 'reserved').length,
    rented: items.filter(p => p.status === 'rented').length,
    sold: items.filter(p => p.status === 'sold').length,
  }
}
