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

// ── POST: incoming messages from WhatsApp ────────────────────────────────────
export async function POST(req: Request) {
  // Read raw body first for signature verification
  const rawBody = await req.text()
  const sig = req.headers.get('x-hub-signature-256')
  const sigOk = await verifyWebhookSignature(rawBody, sig)
  // Log signature state for diagnostics (don't block yet)
  console.log('[WA webhook] sig', { hasSignature: !!sig, sigValid: sigOk })

  let body: any = {}
  try { body = JSON.parse(rawBody) } catch { return NextResponse.json({ ok: true }) }

  // Always ack fast; process asynchronously (but we still await for dev visibility)
  const admin = createAdminClient()
  const messages = parseIncomingWebhook(body)

  for (const m of messages) {
    try {
      // 1. Find or create conversation keyed by channel+external_id (wa phone)
      const { data: existing } = await admin
        .from('conversations')
        .select('*')
        .eq('channel', 'whatsapp')
        .eq('external_id', m.from)
        .maybeSingle()

      let conv: any = existing
      if (!conv) {
        // No subscriber attached yet — leave null; SUPERADMINBOSS will assign
        const { data: created, error } = await admin
          .from('conversations')
          .insert({
            channel: 'whatsapp',
            external_id: m.from,
            contact_name: m.contactName,
            contact_phone: m.from,
            status: 'ai_handling',
            ai_enabled: true,
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
        await markWhatsAppRead(m.wamid).catch(() => {})

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

        // Load persona/subscriber name
        let personaName = 'Sofía'
        let subscriberName = 'Altaprop'
        if (conv.subscriber_id) {
          const [{ data: cfg }, { data: sub }] = await Promise.all([
            admin.from('ai_configs').select('persona_name, system_prompt').eq('subscriber_id', conv.subscriber_id).maybeSingle(),
            admin.from('profiles').select('full_name').eq('id', conv.subscriber_id).maybeSingle(),
          ])
          personaName = cfg?.persona_name || personaName
          subscriberName = sub?.full_name || subscriberName
        }

        const { data: cfg } = await admin
          .from('ai_configs')
          .select('system_prompt')
          .eq('subscriber_id', conv.subscriber_id || '00000000-0000-0000-0000-000000000000')
          .maybeSingle()

        const reply = await getAIReply(aiHistory, {
          personaName,
          subscriberName,
          systemPromptCustom: cfg?.system_prompt || null,
        })

        // Send the reply via WhatsApp
        const send = await sendWhatsAppText(m.from, reply.text)

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
      // Log but don't fail the webhook (Meta will retry otherwise)
      console.error('[whatsapp webhook] error processing message', e)
    }
  }

  return NextResponse.json({ ok: true })
}
