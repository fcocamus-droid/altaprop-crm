export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ROLES } from '@/lib/constants'

interface InitBody {
  session_id: string
  page_url?: string
  referrer?: string
  user_agent?: string
  viewport?: string
}

// POST — bootstrap a public web-chat session. Public endpoint (no auth).
//   - Looks up the existing conversation for the session, or creates one.
//   - Returns the conversation id + the existing message history so the widget
//     can resume mid-conversation if the visitor refreshes the page.
export async function POST(req: Request) {
  let body: InitBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const sessionId = String(body?.session_id || '').slice(0, 80)
  if (!sessionId) {
    return NextResponse.json({ error: 'session_id requerido' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Find or create the conversation, scoped to the boss (default tenant for
  // marketing-site visitors).
  let { data: conv } = await admin
    .from('conversations')
    .select('*')
    .eq('channel', 'web')
    .eq('external_id', sessionId)
    .maybeSingle()

  if (!conv) {
    // Resolve the boss profile so the conversation belongs to a real subscriber
    const { data: boss } = await admin
      .from('profiles')
      .select('id')
      .eq('role', ROLES.SUPERADMINBOSS)
      .limit(1)
      .maybeSingle()

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null
    const ua = body.user_agent || req.headers.get('user-agent') || null

    const { data: created, error } = await admin
      .from('conversations')
      .insert({
        channel: 'web',
        external_id: sessionId,
        contact_name: 'Visitante web',
        status: 'ai_handling',
        ai_enabled: true,
        subscriber_id: boss?.id || null,
        metadata: {
          page_url: body.page_url || null,
          referrer: body.referrer || null,
          user_agent: ua,
          viewport: body.viewport || null,
          ip,
          first_seen_at: new Date().toISOString(),
        },
      })
      .select('*')
      .single()
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    conv = created
  } else {
    // Update last-seen + maybe page_url so the agent sees the visitor's path
    const meta = (conv.metadata as any) || {}
    meta.last_seen_at = new Date().toISOString()
    if (body.page_url) meta.current_page = body.page_url
    await admin.from('conversations').update({ metadata: meta }).eq('id', conv.id)
  }

  const { data: messages } = await admin
    .from('messages')
    .select('id, direction, sender_type, content, sent_at, is_internal')
    .eq('conversation_id', conv.id)
    .eq('is_internal', false)
    .order('sent_at', { ascending: true })
    .limit(50)

  return NextResponse.json({
    conversation_id: conv.id,
    messages: messages || [],
  })
}
