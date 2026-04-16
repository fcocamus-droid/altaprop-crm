import { getUserProfile } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { RoleGuard } from '@/components/auth/role-guard'
import { ROLES, PLANS } from '@/lib/constants'
import { PageHeader } from '@/components/shared/page-header'
import { PlanManager } from '@/components/plan/plan-manager'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Mi Plan - Altaprop' }

interface Props {
  searchParams: { subscription?: string; success?: string; error?: string }
}

export default async function PlanPage({ searchParams }: Props) {
  const profile = await getUserProfile()
  if (!profile) redirect('/login')

  // ?subscription=processing → shown after user authorizes a PreApproval in MP
  const processingSubscription = searchParams.subscription === 'processing'
  const paymentSuccess = searchParams.success === 'true'
  const paymentError = searchParams.error || null

  return (
    <RoleGuard allowedRoles={[ROLES.SUPERADMIN]}>
      <PageHeader title="Mi Plan" description="Gestiona tu suscripcion y plan actual" />
      <PlanManager
        currentPlan={profile.plan}
        subscriptionStatus={profile.subscription_status || 'none'}
        trialEndsAt={profile.trial_ends_at}
        subscriptionEndsAt={profile.subscription_ends_at}
        processingSubscription={processingSubscription}
        paymentSuccess={paymentSuccess}
        paymentError={paymentError}
      />
    </RoleGuard>
  )
}
