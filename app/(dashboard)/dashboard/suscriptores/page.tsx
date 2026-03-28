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

  const { data: profiles } = await admin
    .from('profiles')
    .select('*')
    .eq('role', 'SUPERADMIN')
    .order('created_at', { ascending: false })

  if (!profiles) return []

  const { data: authData } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const emailMap = new Map<string, string>()
  if (authData?.users) {
    for (const u of authData.users) {
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
