// WhatsApp Cloud API client (Meta)
// https://developers.facebook.com/docs/whatsapp/cloud-api

const GRAPH_URL = 'https://graph.facebook.com/v21.0'

function getCreds(override?: { phoneId?: string; token?: string }) {
  const phoneId = override?.phoneId || process.env.META_WA_PHONE_ID
  const token   = override?.token   || process.env.META_WA_TOKEN
  if (!phoneId || !token) {
    throw new Error('META_WA_PHONE_ID y META_WA_TOKEN no estan configurados')
  }
  return { phoneId, token }
}

export interface SendTextResult {
  success: boolean
  wamid?: string
  error?: string
}

export async function sendWhatsAppText(
  to: string,
  text: string,
  creds?: { phoneId?: string; token?: string }
): Promise<SendTextResult> {
  try {
    const { phoneId, token } = getCreds(creds)
    // Normalize phone number: digits only, no '+'
    const normalizedTo = to.replace(/\D/g, '')

    const res = await fetch(`${GRAPH_URL}/${phoneId}/messages`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: normalizedTo,
        type: 'text',
        text: { body: text.substring(0, 4096) },  // WhatsApp limit
      }),
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return { success: false, error: data.error?.message || `HTTP ${res.status}` }
    }

    const wamid = data.messages?.[0]?.id
    return { success: true, wamid }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export type WhatsAppMediaKind = 'image' | 'document' | 'audio' | 'video'

/** Send a media message via a public URL (link) — no need to upload to Meta. */
export async function sendWhatsAppMedia(
  to: string,
  kind: WhatsAppMediaKind,
  link: string,
  opts: { caption?: string; filename?: string } = {},
  creds?: { phoneId?: string; token?: string },
): Promise<SendTextResult> {
  try {
    const { phoneId, token } = getCreds(creds)
    const normalizedTo = to.replace(/\D/g, '')

    const mediaPayload: any = { link }
    if (opts.caption && (kind === 'image' || kind === 'video' || kind === 'document')) {
      mediaPayload.caption = opts.caption.substring(0, 1024)
    }
    if (kind === 'document' && opts.filename) {
      mediaPayload.filename = opts.filename
    }

    const res = await fetch(`${GRAPH_URL}/${phoneId}/messages`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: normalizedTo,
        type: kind,
        [kind]: mediaPayload,
      }),
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok) return { success: false, error: data.error?.message || `HTTP ${res.status}` }
    return { success: true, wamid: data.messages?.[0]?.id }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function sendWhatsAppTemplate(
  to: string,
  templateName: string,
  languageCode: string = 'es',
  components: any[] = [],
  creds?: { phoneId?: string; token?: string }
): Promise<SendTextResult> {
  try {
    const { phoneId, token } = getCreds(creds)
    const normalizedTo = to.replace(/\D/g, '')

    const res = await fetch(`${GRAPH_URL}/${phoneId}/messages`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: normalizedTo,
        type: 'template',
        template: { name: templateName, language: { code: languageCode }, components },
      }),
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok) return { success: false, error: data.error?.message || `HTTP ${res.status}` }
    return { success: true, wamid: data.messages?.[0]?.id }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

/** Fetch a temporary media URL from Meta given the media id. URL expires ~5min. */
export async function fetchWhatsAppMediaUrl(
  mediaId: string,
  creds?: { phoneId?: string; token?: string },
): Promise<{ url: string; mimeType: string } | null> {
  try {
    const { token } = getCreds(creds)
    const res = await fetch(`${GRAPH_URL}/${mediaId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return null
    const data = await res.json()
    return data?.url ? { url: data.url, mimeType: data.mime_type || 'application/octet-stream' } : null
  } catch {
    return null
  }
}

/** Download the binary contents of a Meta media URL (requires auth header). */
export async function downloadWhatsAppMedia(
  url: string,
  creds?: { phoneId?: string; token?: string },
): Promise<{ buffer: Buffer; contentType: string } | null> {
  try {
    const { token } = getCreds(creds)
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) return null
    const ab = await res.arrayBuffer()
    return {
      buffer: Buffer.from(ab),
      contentType: res.headers.get('content-type') || 'application/octet-stream',
    }
  } catch {
    return null
  }
}

/** Mark a message as read. Required to remove the "blue dot" on user side. */
export async function markWhatsAppRead(wamid: string, creds?: { phoneId?: string; token?: string }) {
  try {
    const { phoneId, token } = getCreds(creds)
    await fetch(`${GRAPH_URL}/${phoneId}/messages`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', status: 'read', message_id: wamid }),
    })
  } catch { /* silent */ }
}

// ── Webhook payload parser ───────────────────────────────────────────────────
export interface ParsedIncomingMessage {
  wamid: string
  from: string                 // phone number (digits only)
  contactName: string | null
  text: string | null
  mediaType: 'image' | 'audio' | 'video' | 'document' | 'location' | 'sticker' | null
  mediaId: string | null
  timestamp: string            // ISO
  raw: any
}

export function parseIncomingWebhook(body: any): ParsedIncomingMessage[] {
  const results: ParsedIncomingMessage[] = []
  for (const entry of body?.entry || []) {
    for (const change of entry.changes || []) {
      const value = change.value
      if (!value?.messages) continue
      const contacts = value.contacts || []
      for (const m of value.messages) {
        const contact = contacts.find((c: any) => c.wa_id === m.from)
        const baseIso = new Date((parseInt(m.timestamp, 10) || Date.now() / 1000) * 1000).toISOString()

        let text: string | null = null
        let mediaType: ParsedIncomingMessage['mediaType'] = null
        let mediaId: string | null = null
        if (m.text?.body) text = m.text.body
        else if (m.button?.text) text = m.button.text
        else if (m.interactive?.button_reply?.title) text = m.interactive.button_reply.title
        else if (m.interactive?.list_reply?.title) text = m.interactive.list_reply.title
        else if (m.image)    { mediaType = 'image';    mediaId = m.image.id;    text = m.image.caption || null }
        else if (m.audio)    { mediaType = 'audio';    mediaId = m.audio.id }
        else if (m.video)    { mediaType = 'video';    mediaId = m.video.id;    text = m.video.caption || null }
        else if (m.document) { mediaType = 'document'; mediaId = m.document.id; text = m.document.filename || null }
        else if (m.location) { mediaType = 'location'; text = `${m.location.latitude},${m.location.longitude}` }
        else if (m.sticker)  { mediaType = 'sticker';  mediaId = m.sticker.id }

        results.push({
          wamid: m.id,
          from: m.from,
          contactName: contact?.profile?.name || null,
          text,
          mediaType,
          mediaId,
          timestamp: baseIso,
          raw: m,
        })
      }
    }
  }
  return results
}

/** Verify signature of incoming webhook (x-hub-signature-256). */
export async function verifyWebhookSignature(
  rawBody: string,
  signature: string | null,
  appSecretOverride?: string,
): Promise<boolean> {
  if (!signature) return false
  const secret = appSecretOverride || process.env.META_WA_APP_SECRET
  if (!secret) return true   // fallback: skip if not configured (dev mode / no per-tenant secret)
  const expected = signature.replace(/^sha256=/, '')
  const crypto = await import('crypto')
  const hmac = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
  return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(hmac, 'hex'))
}
