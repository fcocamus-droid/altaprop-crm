import { getUserProfile } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { DashboardHeader } from '@/components/layout/dashboard-header'
import { ROLES } from '@/lib/constants'
import { SubscriptionGate } from '@/components/plan/subscription-gate'
import { expireTrialIfNeeded } from '@/lib/actions/subscription'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const profile = await getUserProfile()

  if (!profile) {
    redirect('/login')
  }

  // Real-time trial expiry: fire-and-forget so it never blocks page rendering.
  // The cron job handles cleanup daily; this is just an immediate best-effort.
  let effectiveStatus = profile.subscription_status || 'none'
  if (effectiveStatus === 'trialing' && profile.trial_ends_at) {
    if (new Date(profile.trial_ends_at) < new Date()) {
      effectiveStatus = 'none'
      // Non-blocking: update DB in background without delaying the page
      void expireTrialIfNeeded(profile.id, profile.full_name, profile.plan)
    }
  }

  // Only SUPERADMIN accounts own a subscription — gate them if expired/canceled/none
  const isBlocked =
    profile.role === ROLES.SUPERADMIN &&
    ['none', 'canceled', 'past_due'].includes(effectiveStatus)

  return (
    <div className="min-h-screen bg-muted/30">
      <Sidebar role={profile.role} userName={profile.full_name} subscriberId={profile.subscriber_id} />
      <div className="lg:pl-64">
        <DashboardHeader role={profile.role} />
        <main className="p-4 md:p-6 lg:p-8">
          {isBlocked ? (
            <SubscriptionGate
              planName={profile.plan}
              status={effectiveStatus}
              trialEndsAt={profile.trial_ends_at}
            />
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  )
}
