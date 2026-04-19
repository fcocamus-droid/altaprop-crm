/**
 * Sends Expo push notifications to one or more devices.
 * Tokens are stored in profiles.push_token (text column).
 *
 * Usage: await sendPushToUsers(['userId1', 'userId2'], { title, body, data })
 */

interface PushMessage {
  title: string
  body: string
  data?: Record<string, unknown>
  sound?: 'default' | null
  badge?: number
  channelId?: string
}

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

export async function sendPushToTokens(tokens: string[], msg: PushMessage) {
  if (!tokens.length) return

  const messages = tokens
    .filter(t => t?.startsWith('ExponentPushToken['))
    .map(to => ({
      to,
      title:     msg.title,
      body:      msg.body,
      data:      msg.data || {},
      sound:     msg.sound ?? 'default',
      badge:     msg.badge,
      channelId: msg.channelId || 'default',
      priority:  'high',
    }))

  if (!messages.length) return

  try {
    await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(messages),
    })
  } catch (e) {
    // Non-blocking — never crash the main action
    console.error('[push-notify] Failed to send push:', e)
  }
}

/**
 * Look up push tokens for a list of user IDs and send them a notification.
 * Accepts any Supabase admin client instance.
 */
export async function sendPushToUsers(
  userIds: string[],
  msg: PushMessage,
  // biome-ignore lint: accepts any supabase admin client
  adminClient: { from: (table: string) => any }
) {
  if (!userIds.length) return

  const { data } = await adminClient
    .from('profiles')
    .select('push_token')
    .in('id', userIds)
    .not('push_token', 'is', null)

  const tokens = ((data as any[]) || []).map(r => r.push_token as string).filter(Boolean)
  await sendPushToTokens(tokens, msg)
}
