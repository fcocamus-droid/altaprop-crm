import { createClient } from '@/lib/supabase/server'

const VISIT_SELECT = '*, property:properties(id, title, address, city), visitor:profiles!visits_visitor_id_fkey(id, full_name, phone)'

export async function getAllVisits() {
  const supabase = createClient()
  const { data } = await supabase
    .from('visits')
    .select(VISIT_SELECT)
    .order('scheduled_at', { ascending: true })
  return data || []
}

export async function getVisitsByVisitor(visitorId: string) {
  const supabase = createClient()
  const { data } = await supabase
    .from('visits')
    .select(VISIT_SELECT)
    .eq('visitor_id', visitorId)
    .order('scheduled_at', { ascending: true })
  return data || []
}

export async function getVisitsByPropertyOwner(ownerId: string) {
  const supabase = createClient()
  const { data } = await supabase
    .from('visits')
    .select('*, property:properties!inner(id, title, address, city, owner_id), visitor:profiles!visits_visitor_id_fkey(id, full_name, phone)')
    .eq('property.owner_id', ownerId)
    .order('scheduled_at', { ascending: true })
  return data || []
}

export async function getVisitsByAgent(agentId: string) {
  const supabase = createClient()
  const { data } = await supabase
    .from('visits')
    .select('*, property:properties!inner(id, title, address, city, agent_id), visitor:profiles!visits_visitor_id_fkey(id, full_name, phone)')
    .eq('property.agent_id', agentId)
    .order('scheduled_at', { ascending: true })
  return data || []
}

export async function getVisitStats() {
  const supabase = createClient()
  const { data } = await supabase.from('visits').select('status')
  if (!data) return { total: 0, pending: 0, confirmed: 0, completed: 0, canceled: 0 }
  return {
    total: data.length,
    pending: data.filter(v => v.status === 'pending').length,
    confirmed: data.filter(v => v.status === 'confirmed').length,
    completed: data.filter(v => v.status === 'completed').length,
    canceled: data.filter(v => v.status === 'canceled').length,
  }
}
