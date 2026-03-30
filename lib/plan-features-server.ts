import { ROLES } from '@/lib/constants'
import { createClient } from '@/lib/supabase/server'

export async function getEffectivePlan(profile: { role: string; plan: string | null; subscriber_id: string | null }): Promise<string | null> {
  if (profile.role === ROLES.SUPERADMINBOSS) return 'enterprise'
  if (profile.role === ROLES.SUPERADMIN) return profile.plan
  // AGENTE/PROPIETARIO inherit plan from their subscriber
  if (profile.subscriber_id) {
    const supabase = createClient()
    const { data } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', profile.subscriber_id)
      .single()
    return data?.plan || null
  }
  return profile.plan
}
