export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  parseIncomingWebhook,
  sendWhatsAppText,
  verifyWebhookSignature,
  markWhatsAppRead,
} from '@/lib/whatsapp/client'
import { getAIReply } from '@/lib/ai-agent/claude'

// ── GET: webhook verification handshake (Meta calls this when you set it up) ─
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const mode      = searchParams.get('hub.mode')
  const token     = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  const expected = process.env.META_WA_WEBHOOK_VERIFY
  if (mode === 'subscribe' && token && expected && token === expected) {
    return new NextResponse(challenge, { status: 200 })
  }
  return new NextResponse('forbidden', { status: 403 })
}

interface SubscriberCreds {
  subscriberId: string | null
  phoneId: string
  token: string
  appSecret: string | null
}

function isWithinBusinessHours(
  hours: Record<string, [number, number] | undefined> | null | undefined,
  timezone: string,
): boolean {
  if (!hours) return true   // no config = always on
  try {
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone || 'America/Santiago',
      weekday: 'short',
      hour: 'numeric',
      hour12: false,
    })
    const parts = fmt.formatToParts(new Date())
    const weekday = (parts.find(p => p.type === 'weekday')?.value || 'Mon').toLowerCase().slice(0, 3)
    const hourStr = parts.find(p => p.type === 'hour')?.value || '0'
    const hour = parseInt(hourStr, 10)
    const range = hours[weekday]
    if (!Array.isArray(range) || range.length < 2) return false
    return hour >= range[0] && hour < range[1]
  } catch {
    return true
  }
}

function matchesHandoffKeyword(text: string | null, keywords: string[] | null | undefined): boolean {
  if (!text || !keywords?.length) return false
  const lower = text.toLowerCase()
  return keywords.some(k => k && lower.includes(k.toLowerCase()))
}

// Look up which subscriber owns this phone_number_id (via integrations table).
// Falls back to the global env-var creds if no integration matches (the BOSS's number).
async function resolveCredsForPhoneId(
  admin: ReturnType<typeof createAdminClient>,
  phoneId: string,
): Promise<SubscriberCreds | null> {
  if (phoneId) {
    // Find integration whose config.phone_number_id matches
    const { data: integrations } = await admin
      .from('integrations')
      .select('subscriber_id, config, enabled')
      .eq('channel', 'whatsapp')
      .eq('enabled', true)

    const match = (integrations || []).find(i => {
      const c = (i as any).config as any
      return c?.phone_number_id === phoneId
    })

    if (match) {
      const c = (match as any).config as any
      return {
        subscriberId: (match as any).subscriber_id,
        phoneId,
        token: c.access_token,
        appSecret: c.app_secret || null,
      }
    }
  }

  // Fallback to global creds (Boss's account)
  const envPhoneId = process.env.META_WA_PHONE_ID
  const envToken = process.env.META_WA_TOKEN
  if (envPhoneId && envToken) {
    return {
      subscriberId: null, // Boss inbox — no subscriber
      phoneId: envPhoneId,
      token: envToken,
      appSecret: process.env.META_WA_APP_SECRET || null,
    }
  }
  return null
}

// ── POST: incoming messages from WhatsApp ────────────────────────────────────
export async function POST(req: Request) {
  // Read raw body first for signature verification
  const rawBody = await req.text()
  const sig = req.headers.get('x-hub-signature-256')

  // Parse body to extract phone_number_id (needed to know which subscriber's secret to use)
  let body: any = {}
  try { body = JSON.parse(rawBody) } catch { return NextResponse.json({ ok: true }) }

  const phoneIdFromBody = body?.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id || ''

  const admin = createAdminClient()
  const creds = await resolveCredsForPhoneId(admin, phoneIdFromBody)

  // Verify signature using subscriber-specific secret (or global as fallback)
  const sigOk = await verifyWebhookSignature(rawBody, sig, creds?.appSecret || undefined)
  if (!sigOk && process.env.NODE_ENV === 'production') {
    return new NextResponse('invalid signature', { status: 401 })
  }

  if (!creds) {
    console.warn('[wa webhook] no creds found for phone_number_id:', phoneIdFromBody)
    return NextResponse.json({ ok: true })
  }

  const messages = parseIncomingWebhook(body)

  for (const m of messages) {
    try {
      // 1. Find or create conversation — keyed by channel+external_id+subscriber_id
      // (Same external phone but different subscribers are different conversations.)
      let convQuery = admin
        .from('conversations')
        .select('*')
        .eq('channel', 'whatsapp')
        .eq('external_id', m.from)
      if (creds.subscriberId) {
        convQuery = convQuery.eq('subscriber_id', creds.subscriberId)
      } else {
        convQuery = convQuery.is('subscriber_id', null)
      }
      const { data: existing } = await convQuery.maybeSingle()

      let conv: any = existing
      if (!conv) {
        const { data: created, error } = await admin
          .from('conversations')
          .insert({
            channel: 'whatsapp',
            external_id: m.from,
            contact_name: m.contactName,
            contact_phone: m.from,
            status: 'ai_handling',
            ai_enabled: true,
            subscriber_id: creds.subscriberId,
          })
          .select('*')
          .single()
        if (error) continue
        conv = created
      }

      // 2. Store the inbound message
      await admin.from('messages').insert({
        conversation_id: conv.id,
        direction: 'inbound',
        sender_type: 'contact',
        content: m.text,
        media_type: m.mediaType || null,
        external_id: m.wamid,
        sent_at: m.timestamp,
        metadata: { wa_raw: m.raw },
      })

      // 3. If AI enabled, reply
      if (conv.ai_enabled) {
        // Load AI config + subscriber profile
        let personaName = 'Sofía'
        let subscriberName = 'Altaprop'
        let systemPromptCustom: string | null = null
        let greeting: string | null = null
        let aiGloballyEnabled = true
        let businessHours: any = null
        let timezone = 'America/Santiago'
        let handoffKeywords: string[] = ['humano','persona real','agente','operador']

        if (conv.subscriber_id) {
          const [{ data: cfg }, { data: sub }] = await Promise.all([
            admin.from('ai_configs').select('*').eq('subscriber_id', conv.subscriber_id).maybeSingle(),
            admin.from('profiles').select('full_name').eq('id', conv.subscriber_id).maybeSingle(),
          ])
          if (cfg) {
            personaName = cfg.persona_name || personaName
            systemPromptCustom = cfg.system_prompt || null
            greeting = cfg.greeting || null
            aiGloballyEnabled = cfg.enabled !== false
            businessHours = cfg.business_hours || null
            timezone = cfg.timezone || timezone
            if (Array.isArray(cfg.handoff_keywords) && cfg.handoff_keywords.length) {
              handoffKeywords = cfg.handoff_keywords
            }
          }
          subscriberName = sub?.full_name || subscriberName
        }

        const handoffByKeyword = matchesHandoffKeyword(m.text, handoffKeywords)
        const offHours = !isWithinBusinessHours(businessHours, timezone)

        // Skip AI: globally disabled, keyword handoff, or outside business hours
        if (!aiGloballyEnabled || handoffByKeyword || offHours) {
          await admin.from('conversations')
            .update({ status: 'human_handling' })
            .eq('id', conv.id)
          continue
        }

        await markWhatsAppRead(m.wamid, { phoneId: creds.phoneId, token: creds.token }).catch(() => {})

        // Load recent history (last 20 messages)
        const { data: history } = await admin
          .from('messages')
          .select('direction, content, sender_type')
          .eq('conversation_id', conv.id)
          .order('sent_at', { ascending: true })
          .limit(20)

        const aiHistory = (history || [])
          .filter(h => h.content)
          .map(h => ({
            role: (h.direction === 'inbound' ? 'user' : 'assistant') as 'user' | 'assistant',
            content: h.content as string,
          }))

        const reply = await getAIReply(aiHistory, {
          personaName,
          subscriberName,
          systemPromptCustom,
          greeting,
        })

        // Send the reply via WhatsApp using the subscriber's creds
        const send = await sendWhatsAppText(m.from, reply.text, {
          phoneId: creds.phoneId,
          token: creds.token,
        })

        // Store outbound message
        await admin.from('messages').insert({
          conversation_id: conv.id,
          direction: 'outbound',
          sender_type: 'ai',
          content: reply.text,
          external_id: send.wamid || null,
          error: send.success ? null : send.error,
          metadata: { captured_lead: reply.capturedLead || null },
        })

        // Update conversation with captured lead data
        const updates: Record<string, any> = {}
        if (reply.capturedLead?.name && !conv.contact_name) updates.contact_name = reply.capturedLead.name
        if (reply.capturedLead?.email && !conv.contact_email) updates.contact_email = reply.capturedLead.email
        if (reply.capturedLead?.rut && !conv.contact_rut) updates.contact_rut = reply.capturedLead.rut
        if (reply.shouldHandoff) updates.status = 'human_handling'
        if (Object.keys(updates).length > 0) {
          await admin.from('conversations').update(updates).eq('id', conv.id)
        }
      }
    } catch (e) {
      console.error('[whatsapp webhook] error processing message', e)
    }
  }

  return NextResponse.json({ ok: true })
}
