import { createClient } from '@/lib/supabase/server'

export async function getPlatformStats() {
  const supabase = createClient()
  const [orgs, active, trialing] = await Promise.all([
    supabase.from('organizations').select('id', { count: 'exact', head: true }),
    supabase.from('organizations').select('id', { count: 'exact', head: true }).eq('subscription_status', 'active'),
    supabase.from('organizations').select('id', { count: 'exact', head: true }).eq('subscription_status', 'trialing'),
  ])

  // Calculate MRR
  const { data: plans } = await supabase.from('organizations').select('plan').eq('subscription_status', 'active')
  const mrr = (plans || []).reduce((sum, o) => {
    if (o.plan === 'basico') return sum + 29
    if (o.plan === 'pro') return sum + 49
    if (o.plan === 'enterprise') return sum + 99
    return sum
  }, 0)

  return {
    totalOrgs: orgs.count || 0,
    activeOrgs: active.count || 0,
    trialingOrgs: trialing.count || 0,
    mrr,
  }
}

export async function getAllOrganizations(search?: string) {
  const supabase = createClient()
  let query = supabase.from('organizations').select('*').order('created_at', { ascending: false })
  if (search) query = query.or(`name.ilike.%${search}%,slug.ilike.%${search}%`)
  const { data } = await query
  return data || []
}

export async function getOrganizationDetail(id: string) {
  const supabase = createClient()
  const [{ data: org }, { data: members }, { data: events }] = await Promise.all([
    supabase.from('organizations').select('*').eq('id', id).single(),
    supabase.from('org_members').select('*, profile:profiles(full_name, phone, role)').eq('org_id', id),
    supabase.from('subscription_events').select('*').eq('org_id', id).order('created_at', { ascending: false }).limit(20),
  ])
  return { org, members: members || [], events: events || [] }
}
