// Web Push helper for the inbox. Sends the same VAPID-signed payload to one
// or many subscribers; cleans up endpoints that come back as 404/410 (gone).

import webpush from 'web-push'
import { createAdminClient } from '@/lib/supabase/admin'

let configured = false
function configure() {
  if (configured) return
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT || 'mailto:noreply@altaprop.cl'
  if (!pub || !priv) {
    throw new Error('VAPID keys missing — set NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY')
  }
  webpush.setVapidDetails(subject, pub, priv)
  configured = true
}

export interface PushPayload {
  title: string
  body: string
  url?: string                  // where to open on click
  tag?: string                  // dedupes notifications
  conversationId?: string
}

/** Send to every subscription for the given user IDs. Best-effort: errors
 *  from individual endpoints are swallowed (and stale endpoints are deleted). */
export async function sendPushToUsers(userIds: string[], payload: PushPayload): Promise<number> {
  if (!userIds.length) return 0
  try {
    configure()
  } catch {
    return 0
  }
  const admin = createAdminClient()
  const { data: subs } = await admin
    .from('push_subscriptions')
    .select('*')
    .in('user_id', userIds)

  if (!subs?.length) return 0

  const body = JSON.stringify(payload)
  let sent = 0
  await Promise.all(subs.map(async sub => {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        body,
        { TTL: 60 * 60 * 24 },
      )
      sent++
      // Mark as used (no await required, but include for observability)
      admin.from('push_subscriptions').update({ last_used_at: new Date().toISOString() }).eq('id', sub.id).then(() => {})
    } catch (e: any) {
      // 404/410 mean the subscription is gone — purge it
      const code = e?.statusCode
      if (code === 404 || code === 410) {
        await admin.from('push_subscriptions').delete().eq('id', sub.id)
      }
    }
  }))
  return sent
}
