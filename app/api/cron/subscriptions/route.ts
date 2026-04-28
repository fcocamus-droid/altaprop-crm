import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PLANS } from '@/lib/constants'
import {
  buildTrialEndingSoonEmail,
  buildTrialExpiredEmail,
  buildRenewalReminderEmail,
  buildSubscriptionExpiredEmail,
  buildCanceledEmail,
  sendSubscriptionEmail,
} from '@/lib/emails/subscription-emails'

export const dynamic = 'force-dynamic'

// Vercel cron calls this daily at 12:00 UTC (09:00 Santiago)
// Requires Authorization: Bearer CRON_SECRET header (set in vercel.json / env)
export async function GET(req: NextRequest) {
  // Cron secret is mandatory — without it, anyone could ping this endpoint
  // and force a daily downgrade-and-email cascade.
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET no configurado' }, { status: 503 })
  }
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const now = new Date()
  const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
  const in2Days = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000)
  const ago7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  // Helper: get email from Supabase Auth
  const { data: authData } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const emailMap = new Map<string, string>()
  if (authData?.users) {
    for (const u of authData.users) {
      emailMap.set(u.id, u.email || '')
    }
  }

  let processed = 0
  const log: string[] = []

  // ── 1. Trials ending in 2 days → reminder email ─────────────────────────────
  const { data: trialsEndingSoon } = await admin
    .from('profiles')
    .select('id, full_name, plan, trial_ends_at')
    .eq('subscription_status', 'trialing')
    .gte('trial_ends_at', now.toISOString())
    .lte('trial_ends_at', in2Days.toISOString())

  for (const p of trialsEndingSoon || []) {
    const email = emailMap.get(p.id)
    if (!email) continue
    const plan = PLANS.find(pl => pl.id === p.plan)
    await sendSubscriptionEmail(
      email,
      buildTrialEndingSoonEmail(p.full_name || 'Cliente', plan?.name || p.plan || 'tu plan', p.trial_ends_at)
    )
    log.push(`trial_ending_soon: ${p.id}`)
    processed++
  }

  // ── 2. Expired trials → downgrade to 'none' + email ──────────────────────────
  const { data: expiredTrials } = await admin
    .from('profiles')
    .select('id, full_name, plan, trial_ends_at')
    .eq('subscription_status', 'trialing')
    .lt('trial_ends_at', now.toISOString())

  for (const p of expiredTrials || []) {
    await admin
      .from('profiles')
      .update({ subscription_status: 'none', plan: null, max_agents: 0, trial_ends_at: null })
      .eq('id', p.id)

    const email = emailMap.get(p.id)
    if (email) {
      const plan = PLANS.find(pl => pl.id === p.plan)
      await sendSubscriptionEmail(
        email,
        buildTrialExpiredEmail(p.full_name || 'Cliente', plan?.name || p.plan || 'tu plan')
      )
    }
    log.push(`trial_expired: ${p.id}`)
    processed++
  }

  // ── 3. Active subscriptions renewing in 3 days → reminder email ──────────────
  const { data: renewingSoon } = await admin
    .from('profiles')
    .select('id, full_name, plan, subscription_ends_at')
    .eq('subscription_status', 'active')
    .gte('subscription_ends_at', now.toISOString())
    .lte('subscription_ends_at', in3Days.toISOString())

  for (const p of renewingSoon || []) {
    const email = emailMap.get(p.id)
    if (!email) continue
    const plan = PLANS.find(pl => pl.id === p.plan)
    if (!plan) continue
    await sendSubscriptionEmail(
      email,
      buildRenewalReminderEmail(p.full_name || 'Cliente', plan.name, plan.price, p.subscription_ends_at)
    )
    log.push(`renewal_reminder: ${p.id}`)
    processed++
  }

  // ── 4. Active subscriptions expired → mark past_due + email ──────────────────
  const { data: expiredSubs } = await admin
    .from('profiles')
    .select('id, full_name, plan, subscription_ends_at')
    .eq('subscription_status', 'active')
    .lt('subscription_ends_at', now.toISOString())

  for (const p of expiredSubs || []) {
    await admin
      .from('profiles')
      .update({ subscription_status: 'past_due' })
      .eq('id', p.id)

    const email = emailMap.get(p.id)
    if (email) {
      const plan = PLANS.find(pl => pl.id === p.plan)
      await sendSubscriptionEmail(
        email,
        buildSubscriptionExpiredEmail(p.full_name || 'Cliente', plan?.name || p.plan || 'tu plan', plan?.price || 0)
      )
    }
    log.push(`subscription_expired: ${p.id}`)
    processed++
  }

  // ── 5. past_due for 7+ days → cancel definitively + email ────────────────────
  const { data: oldPastDue } = await admin
    .from('profiles')
    .select('id, full_name, plan, subscription_ends_at')
    .eq('subscription_status', 'past_due')
    .lt('subscription_ends_at', ago7Days.toISOString())

  for (const p of oldPastDue || []) {
    await admin
      .from('profiles')
      .update({ subscription_status: 'canceled', plan: null, max_agents: 0 })
      .eq('id', p.id)

    const email = emailMap.get(p.id)
    if (email) {
      const plan = PLANS.find(pl => pl.id === p.plan)
      await sendSubscriptionEmail(
        email,
        buildCanceledEmail(p.full_name || 'Cliente', plan?.name || p.plan || 'tu plan', p.subscription_ends_at)
      )
    }
    log.push(`auto_canceled: ${p.id}`)
    processed++
  }

  return NextResponse.json({ ok: true, processed, log })
}
