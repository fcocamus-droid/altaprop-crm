'use server'

import { getUserProfile } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { PLANS } from '@/lib/constants'
import { revalidatePath } from 'next/cache'
import {
  buildCanceledEmail,
  buildPausedEmail,
  buildTrialExpiredEmail,
  sendSubscriptionEmail,
} from '@/lib/emails/subscription-emails'

// ─── Helpers ────────────────────────────────────────────────────────────────

async function patchMpPreApproval(preapprovalId: string, status: 'paused' | 'cancelled' | 'authorized') {
  const mpToken = process.env.MERCADOPAGO_ACCESS_TOKEN!
  const res = await fetch(`https://api.mercadopago.com/preapproval/${preapprovalId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${mpToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    console.error('[patchMpPreApproval] error:', data)
    return false
  }
  return true
}

/**
 * Called from the dashboard layout when a trialing user's trial_ends_at is in the past.
 * Updates their status to 'none' and sends the expiry email immediately (before the cron runs).
 * Safe to call repeatedly — after the first update the status is 'none' and this won't fire again.
 */
export async function expireTrialIfNeeded(userId: string, fullName: string | null, planId: string | null) {
  const admin = createAdminClient()

  const { error } = await admin
    .from('profiles')
    .update({ subscription_status: 'none', plan: null, max_agents: 0, trial_ends_at: null })
    .eq('id', userId)
    .eq('subscription_status', 'trialing') // only update if still trialing (prevents double-send)

  if (error) return

  const { data: authData } = await admin.auth.admin.getUserById(userId)
  const email = authData?.user?.email
  if (email) {
    const plan = PLANS.find(p => p.id === planId)
    await sendSubscriptionEmail(
      email,
      buildTrialExpiredEmail(fullName || 'Cliente', plan?.name || planId || 'tu plan')
    )
  }
}

async function getUserEmail(userId: string): Promise<string | null> {
  const admin = createAdminClient()
  const { data } = await admin.auth.admin.getUserById(userId)
  return data?.user?.email || null
}

// ─── Pause ───────────────────────────────────────────────────────────────────

export async function pauseSubscription() {
  const profile = await getUserProfile()
  if (!profile) return { error: 'No autorizado' }
  if (!['active', 'trialing'].includes(profile.subscription_status || '')) {
    return { error: 'Solo puedes pausar una suscripción activa o en periodo de prueba' }
  }

  // If there's a real MP subscription, pause it there first
  if (profile.mp_subscription_id) {
    const ok = await patchMpPreApproval(profile.mp_subscription_id, 'paused')
    if (!ok) return { error: 'No se pudo pausar la suscripción en Mercado Pago. Intenta de nuevo.' }
    // Webhook will update Supabase automatically — but update locally too for immediate feedback
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('profiles')
    .update({ subscription_status: 'paused' })
    .eq('id', profile.id)

  if (error) return { error: error.message }

  // Send confirmation email
  const email = await getUserEmail(profile.id)
  if (email) {
    const plan = PLANS.find(p => p.id === profile.plan)
    await sendSubscriptionEmail(email, buildPausedEmail(profile.full_name || 'Cliente', plan?.name || profile.plan || 'tu plan'))
  }

  revalidatePath('/dashboard/plan')
  return { success: true }
}

// ─── Resume ──────────────────────────────────────────────────────────────────

export async function resumeSubscription() {
  const profile = await getUserProfile()
  if (!profile) return { error: 'No autorizado' }
  if (profile.subscription_status !== 'paused') {
    return { error: 'La suscripción no está pausada' }
  }

  // If there's a real MP subscription, reactivate it in MP
  if (profile.mp_subscription_id) {
    const ok = await patchMpPreApproval(profile.mp_subscription_id, 'authorized')
    if (!ok) return { error: 'No se pudo reactivar la suscripción en Mercado Pago. Intenta de nuevo.' }
  }

  const admin = createAdminClient()
  // Extend subscription end date by the remaining time from today
  const now = new Date()
  const currentEnd = profile.subscription_ends_at ? new Date(profile.subscription_ends_at) : now
  // If subscription_ends_at is in the past, set a new 1-month period
  const newEnd = currentEnd < now ? new Date(now.setMonth(now.getMonth() + 1)) : currentEnd

  const { error } = await admin
    .from('profiles')
    .update({ subscription_status: 'active', subscription_ends_at: newEnd.toISOString() })
    .eq('id', profile.id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/plan')
  return { success: true }
}

// ─── Cancel ──────────────────────────────────────────────────────────────────

export async function cancelSubscription() {
  const profile = await getUserProfile()
  if (!profile) return { error: 'No autorizado' }
  if (!['active', 'trialing', 'paused', 'past_due'].includes(profile.subscription_status || '')) {
    return { error: 'No hay suscripción activa para cancelar' }
  }

  // If there's a real MP subscription, cancel it in MP to stop future charges
  if (profile.mp_subscription_id) {
    const ok = await patchMpPreApproval(profile.mp_subscription_id, 'cancelled')
    if (!ok) return { error: 'No se pudo cancelar la suscripción en Mercado Pago. Intenta de nuevo.' }
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('profiles')
    .update({ subscription_status: 'canceled' })
    .eq('id', profile.id)

  if (error) return { error: error.message }

  // Send confirmation email
  const email = await getUserEmail(profile.id)
  if (email) {
    const plan = PLANS.find(p => p.id === profile.plan)
    await sendSubscriptionEmail(
      email,
      buildCanceledEmail(profile.full_name || 'Cliente', plan?.name || profile.plan || 'tu plan', profile.subscription_ends_at)
    )
  }

  revalidatePath('/dashboard/plan')
  return { success: true }
}
