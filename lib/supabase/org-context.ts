import { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { getCurrentOrgId } from '@/lib/org'

export async function setOrgContext(supabase: SupabaseClient, orgId: string) {
  if (!orgId) return
  await supabase.rpc('set_org_context', { p_org_id: orgId })
}

/** Create a Supabase client with org context already set */
export async function createOrgClient() {
  const supabase = createClient()
  const orgId = getCurrentOrgId()
  if (orgId) {
    await setOrgContext(supabase, orgId)
  }
  return { supabase, orgId }
}
