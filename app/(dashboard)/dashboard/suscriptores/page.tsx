import { getUserProfile } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { RoleGuard } from '@/components/auth/role-guard'
import { ROLES } from '@/lib/constants'
import { PageHeader } from '@/components/shared/page-header'
import { SubscriberList } from '@/components/subscribers/subscriber-list'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Suscriptores - Altaprop' }

async function getSubscribers() {
  const admin = createAdminClient()

  // Run profiles + auth users in parallel — they are independent queries
  const [profilesResult, authResult] = await Promise.all([
    admin
      .from('profiles')
      .select('id, full_name, phone, rut, plan, subscription_status, subscription_ends_at, trial_ends_at, mp_subscription_id, max_agents, extra_agent_slots, created_at, updated_at, website_subdomain, website_domain, website_enabled')
      .eq('role', 'SUPERADMIN')
      .order('created_at', { ascending: false }),
    admin.auth.admin.listUsers({ perPage: 1000 }),
  ])

  const profiles = profilesResult.data
  if (!profiles) return []

  const emailMap = new Map<string, string>()
  if (authResult.data?.users) {
    for (const u of authResult.data.users) {
      emailMap.set(u.id, u.email || '')
    }
  }

  return profiles.map(p => ({
    ...p,
    email: emailMap.get(p.id) || '',
  }))
}

export default async function SuscriptoresPage() {
  const profile = await getUserProfile()
  if (!profile) redirect('/login')

  const subscribers = await getSubscribers()

  return (
    <RoleGuard allowedRoles={[ROLES.SUPERADMINBOSS]}>
      <PageHeader title="Suscriptores" description="Gestiona tus clientes y sus planes de suscripcion" />
      <SubscriberList subscribers={subscribers} />
    </RoleGuard>
  )
}
