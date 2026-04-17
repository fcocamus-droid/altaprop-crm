import { RoleGuard } from '@/components/auth/role-guard'
import { getUsers } from '@/lib/actions/users'
import { PageHeader } from '@/components/shared/page-header'
import { UserManagement } from '@/components/users/user-management'
import { AgentSlotsBanner } from '@/components/users/agent-slots-banner'
import { ADMIN_ROLES, ROLES } from '@/lib/constants'
import { getMaxAgents, getPlanName } from '@/lib/plan-features'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Agentes - Altaprop' }

export default async function UsuariosPage() {
  let users: any[] = []
  let currentUserId = ''
  let currentUserRole = 'SUPERADMIN'
  let planName = ''
  let usedAgents = 0
  let maxAgents = 1
  let extraSlots = 0
  let hasPendingRequest = false

  try {
    const result = await getUsers()
    users = result.users
    currentUserId = result.profile?.id || ''
    currentUserRole = result.profile?.role || 'SUPERADMIN'

    // Compute agent usage for the banner (only for SUPERADMIN subscribers)
    if (result.profile?.role === ROLES.SUPERADMIN) {
      const admin = createAdminClient()
      const subscriberId = result.profile.subscriber_id || result.profile.id

      // Run all three queries in parallel — they are independent of each other
      const [{ data: subscriberProfile }, { count }, { data: pendingReq }] = await Promise.all([
        admin
          .from('profiles')
          .select('plan, extra_agent_slots')
          .eq('id', subscriberId)
          .single(),
        admin
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('subscriber_id', subscriberId)
          .eq('role', 'AGENTE'),
        admin
          .from('agent_slot_requests' as any)
          .select('id')
          .eq('subscriber_id', subscriberId)
          .eq('status', 'pending')
          .maybeSingle(),
      ])

      const plan = (subscriberProfile as any)?.plan ?? result.profile.plan
      extraSlots = (subscriberProfile as any)?.extra_agent_slots ?? 0
      planName = getPlanName(plan)
      maxAgents = getMaxAgents(plan, extraSlots)
      usedAgents = count || 0
      hasPendingRequest = !!pendingReq
    }
  } catch {
    // Supabase may not be configured yet
  }

  const isSuperAdmin = currentUserRole === ROLES.SUPERADMIN

  return (
    <RoleGuard allowedRoles={ADMIN_ROLES}>
      <PageHeader title="Agentes" description="Administra los agentes de tu equipo" />
      {isSuperAdmin && (
        <AgentSlotsBanner
          planName={planName}
          usedAgents={usedAgents}
          maxAgents={maxAgents}
          extraSlots={extraSlots}
          hasPendingRequest={hasPendingRequest}
          isSuperAdmin={isSuperAdmin}
        />
      )}
      <UserManagement users={users} currentUserId={currentUserId} currentUserRole={currentUserRole} />
    </RoleGuard>
  )
}
