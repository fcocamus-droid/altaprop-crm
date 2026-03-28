import { getUserProfile } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { RoleGuard } from '@/components/auth/role-guard'
import { ROLES, PLANS } from '@/lib/constants'
import { PageHeader } from '@/components/shared/page-header'
import { PlanManager } from '@/components/plan/plan-manager'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Mi Plan - Altaprop' }

export default async function PlanPage() {
  const profile = await getUserProfile()
  if (!profile) redirect('/login')

  return (
    <RoleGuard allowedRoles={[ROLES.SUPERADMIN]}>
      <PageHeader title="Mi Plan" description="Gestiona tu suscripcion y plan actual" />
      <PlanManager
        currentPlan={profile.plan}
        subscriptionStatus={profile.subscription_status || 'none'}
        trialEndsAt={profile.trial_ends_at}
        subscriptionEndsAt={profile.subscription_ends_at}
      />
    </RoleGuard>
  )
}
