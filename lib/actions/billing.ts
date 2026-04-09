'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentOrgId } from '@/lib/org'
import { getUserProfile } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function getSubscriptionDetails() {
  const orgId = getCurrentOrgId()
  if (!orgId) return null

  const supabase = createClient()
  const { data } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', orgId)
    .single()

  return data
}

export async function getSubscriptionEvents() {
  const orgId = getCurrentOrgId()
  if (!orgId) return []

  const supabase = createClient()
  const { data } = await supabase
    .from('subscription_events')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(20)

  return data || []
}

export async function updatePlan(plan: string) {
  const profile = await getUserProfile()
  if (!profile || (profile as any).org_role !== 'ADMIN') {
    return { error: 'No autorizado' }
  }

  const orgId = getCurrentOrgId()
  if (!orgId) return { error: 'Sin organización' }

  const supabase = createClient()
  const maxAgents = plan === 'basico' ? 1 : plan === 'pro' ? 3 : 10

  const { error } = await supabase
    .from('organizations')
    .update({ plan, max_agents: maxAgents })
    .eq('id', orgId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/configuracion/billing')
  return { success: true }
}
