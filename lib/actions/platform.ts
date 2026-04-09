'use server'

import { createClient } from '@/lib/supabase/server'
import { getUserProfile } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

async function requirePlatformAdmin() {
  const profile = await getUserProfile()
  if (!profile || profile.role !== 'SUPERADMIN') throw new Error('No autorizado')
  return profile
}

export async function disableOrganization(orgId: string) {
  await requirePlatformAdmin()
  const supabase = createClient()
  await supabase.from('organizations').update({ subscription_status: 'canceled' }).eq('id', orgId)
  revalidatePath('/admin/organizations')
  return { success: true }
}

export async function extendTrial(orgId: string, days: number) {
  await requirePlatformAdmin()
  const supabase = createClient()
  await supabase.from('organizations').update({
    trial_ends_at: new Date(Date.now() + days * 86400000).toISOString(),
    subscription_status: 'trialing',
  }).eq('id', orgId)
  revalidatePath('/admin/organizations')
  return { success: true }
}

export async function changeOrgPlan(orgId: string, plan: string) {
  await requirePlatformAdmin()
  const maxAgents = plan === 'basico' ? 1 : plan === 'pro' ? 3 : 10
  const supabase = createClient()
  await supabase.from('organizations').update({ plan, max_agents: maxAgents }).eq('id', orgId)
  revalidatePath('/admin/organizations')
  return { success: true }
}
