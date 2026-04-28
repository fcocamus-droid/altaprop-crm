export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAIReply } from '@/lib/ai-agent/claude'
import { sendPushToUsers } from '@/lib/push/server'
import { ROLES } from '@/lib/constants'

interface MessageBody {
  session_id: string
  subscriber_id?: string | null
  content: string
  page_url?: string
}

// In-memory leaky bucket per (ip, session_id). Survives only a single server
// process — Vercel will spin up multiple instances so a determined attacker
// can multiply this — but cuts the cost of a casual "hold-down-Enter" abuse
// from O(unbounded) Claude calls to ~30/min per process per session. Replace
// with Upstash/Redis later if abuse becomes real.
type Bucket = { count: number; resetAt: number }
const RATE_LIMIT = 30
const RATE_WINDOW_MS = 60 * 1000
const buckets = new Map<string, Bucket>()
function rateLimited(key: string): boolean {
  const now = Date.now()
  const b = buckets.get(key)
  if (!b || b.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS })
    return false
  }
  b.count++
  return b.count > RATE_LIMIT
}

// POST — visitor sends a message. We store it, generate Sofía's reply, store
// that too, and return both back so the widget can render them. Realtime takes
// care of pushing them into the agent's inbox.
export async function POST(req: Request) {
  let body: MessageBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const sessionId = String(body?.session_id || '').slice(0, 80)
  const content = String(body?.content || '').trim().slice(0, 4000)
  if (!sessionId || !content) {
    return NextResponse.json({ error: 'session_id y content requeridos' }, { status: 400 })
  }

  // Rate limit per (ip, session_id) pair so a runaway tab can't burn through
  // Claude tokens.
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (rateLimited(`${ip}:${sessionId}`)) {
    return NextResponse.json(
      { error: 'Demasiados mensajes en poco tiempo. Espera un momento e intenta de nuevo.' },
      { status: 429 },
    )
  }

  const admin = createAdminClient()
  let convQuery = admin
    .from('conversations')
    .select('*')
    .eq('channel', 'web')
    .eq('external_id', sessionId)
  if (body.subscriber_id) {
    convQuery = convQuery.eq('subscriber_id', body.subscriber_id)
  }
  const { data: conv } = await convQuery.maybeSingle()
  if (!conv) {
    return NextResponse.json({ error: 'Sesión no encontrada — recarga la página' }, { status: 404 })
  }

  const now = new Date().toISOString()

  // Store the visitor's inbound message
  const { data: userMsg, error: insertErr } = await admin
    .from('messages')
    .insert({
      conversation_id: conv.id,
      direction: 'inbound',
      sender_type: 'contact',
      content,
      sent_at: now,
      metadata: { page_url: body.page_url || null },
    })
    .select('*')
    .single()
  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 })
  }

  // Notify the team (push) so an agent can step in if needed
  try {
    const recipients = new Set<string>()
    if (conv.agent_id) recipients.add(conv.agent_id)
    if (conv.subscriber_id) recipients.add(conv.subscriber_id)
    if (recipients.size) {
      await sendPushToUsers(Array.from(recipients), {
        title: conv.contact_name || 'Visitante web',
        body: content.slice(0, 140),
        url: '/dashboard/conversaciones',
        tag: conv.id,
        conversationId: conv.id,
      })
    }
  } catch { /* best-effort */ }

  // If a human is handling it (or AI was disabled), bail out — the agent will
  // reply manually from the inbox. Visitor just sees their own message.
  if (!conv.ai_enabled || conv.status === 'human_handling') {
    return NextResponse.json({ user_message: userMsg, ai_message: null })
  }

  // Build the AI context based on the subscriber's config
  let personaName = 'Sofía'
  let subscriberName = 'Altaprop'
  let systemPromptCustom: string | null = null
  let greeting: string | null = null
  let aiGloballyEnabled = true
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
    }
    subscriberName = sub?.full_name || subscriberName
  }

  if (!aiGloballyEnabled) {
    return NextResponse.json({ user_message: userMsg, ai_message: null })
  }

  // Pull last 20 non-internal messages for AI context
  const { data: history } = await admin
    .from('messages')
    .select('direction, content, sender_type')
    .eq('conversation_id', conv.id)
    .eq('is_internal', false)
    .order('sent_at', { ascending: true })
    .limit(20)

  const aiHistory = (history || [])
    .filter(h => h.content)
    .map(h => ({
      role: (h.direction === 'inbound' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: h.content as string,
    }))

  let aiText = '...'
  let captured: any = null
  let shouldHandoff = false
  try {
    const reply = await getAIReply(aiHistory, {
      personaName,
      subscriberName,
      systemPromptCustom,
      greeting,
    })
    aiText = reply.text
    captured = reply.capturedLead || null
    shouldHandoff = !!reply.shouldHandoff
  } catch (e: any) {
    aiText = 'Disculpa, en este momento no puedo responder. Un asesor te contactará pronto.'
  }

  // Store AI message
  const { data: aiMsg } = await admin
    .from('messages')
    .insert({
      conversation_id: conv.id,
      direction: 'outbound',
      sender_type: 'ai',
      content: aiText,
      metadata: { captured_lead: captured },
    })
    .select('*')
    .single()

  // Persist captured lead fields onto the conversation so they show in the inbox
  const updates: Record<string, any> = {}
  if (captured?.name && !conv.contact_name) updates.contact_name = captured.name
  if (captured?.email && !conv.contact_email) updates.contact_email = captured.email
  if (captured?.rut && !conv.contact_rut) updates.contact_rut = captured.rut
  if (shouldHandoff) updates.status = 'human_handling'
  if (Object.keys(updates).length) {
    await admin.from('conversations').update(updates).eq('id', conv.id)
  }

  return NextResponse.json({ user_message: userMsg, ai_message: aiMsg })
}

// Skip role check — this is a public endpoint for the marketing site.
// Throw so unused-imports doesn't complain.
void ROLES
