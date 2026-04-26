'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import {
  Send, Bot, User as UserIcon, CheckCheck, Loader2,
  MessageSquare, Search, ChevronRight, UserPlus, UserMinus,
  MoreVertical, CircleCheck, Inbox as InboxIcon, Settings,
} from 'lucide-react'
import {
  CHANNELS, CONVERSATION_STATUSES, getChannelConfig, getStatusConfig,
  type Conversation, type Message,
} from '@/lib/conversations-constants'

function formatRelative(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'ahora'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d`
  return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
}

export function ConversationsInbox({ currentUserRole, currentUserId }: {
  currentUserRole: string
  currentUserId: string
}) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [msgLoading, setMsgLoading] = useState(false)
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null)

  const [channelFilter, setChannelFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [search, setSearch] = useState('')

  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [converting, setConverting] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // ── Load conversations ─────────────────────────────────────────────────────
  async function loadConversations() {
    setLoading(true)
    try {
      const res = await fetch('/api/conversations')
      const data = await res.json()
      setConversations(data.conversations || [])
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { loadConversations() }, [])
  // Poll every 20s (realtime would be better, but keep simple)
  useEffect(() => {
    const id = setInterval(loadConversations, 20000)
    return () => clearInterval(id)
  }, [])

  // ── Load messages when conversation selected ───────────────────────────────
  async function loadConversation(id: string) {
    setMsgLoading(true)
    try {
      const res = await fetch(`/api/conversations/${id}`)
      const data = await res.json()
      setActiveConversation(data.conversation)
      setMessages(data.messages || [])
    } finally {
      setMsgLoading(false)
    }
  }
  useEffect(() => {
    if (selectedId) loadConversation(selectedId)
    else { setMessages([]); setActiveConversation(null) }
  }, [selectedId])

  // Auto-scroll messages to bottom
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages])

  // ── Filter list ────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = conversations
    if (channelFilter !== 'all') list = list.filter(c => c.channel === channelFilter)
    if (statusFilter !== 'all') list = list.filter(c => c.status === statusFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(c =>
        (c.contact_name || '').toLowerCase().includes(q) ||
        (c.contact_phone || '').toLowerCase().includes(q) ||
        (c.contact_email || '').toLowerCase().includes(q) ||
        (c.last_message_preview || '').toLowerCase().includes(q)
      )
    }
    return list
  }, [conversations, channelFilter, statusFilter, search])

  const totalUnread = conversations.reduce((a, c) => a + (c.unread_count || 0), 0)
  const channelCounts = useMemo(() => {
    const map = new Map<string, number>()
    conversations.forEach(c => map.set(c.channel, (map.get(c.channel) || 0) + 1))
    return map
  }, [conversations])

  // ── Actions ────────────────────────────────────────────────────────────────
  async function sendMessage() {
    if (!draft.trim() || !selectedId) return
    setSending(true)
    try {
      const res = await fetch(`/api/conversations/${selectedId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: draft }),
      })
      const data = await res.json()
      if (data.message) {
        setMessages(prev => [...prev, data.message])
        setDraft('')
        loadConversations()
      }
    } finally {
      setSending(false)
    }
  }

  async function toggleAI() {
    if (!activeConversation) return
    const newVal = !activeConversation.ai_enabled
    setActiveConversation({ ...activeConversation, ai_enabled: newVal })
    await fetch(`/api/conversations/${activeConversation.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ai_enabled: newVal, status: newVal ? 'ai_handling' : 'human_handling' }),
    })
    loadConversations()
  }

  async function convertToProspecto() {
    if (!activeConversation) return
    setConverting(true)
    try {
      const res = await fetch(`/api/conversations/${activeConversation.id}/convert`, { method: 'POST' })
      const data = await res.json()
      if (data.prospecto) {
        setActiveConversation({ ...activeConversation, status: 'converted', prospecto_id: data.prospecto.id })
        loadConversations()
      }
    } finally {
      setConverting(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full bg-slate-50 border-t">
      {/* ── Column 1: Channels sidebar ──────────────────────────────────────── */}
      <aside className="w-52 shrink-0 border-r bg-white p-3 overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1.5">
            <InboxIcon className="h-3 w-3" /> Inbox
            {totalUnread > 0 && (
              <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{totalUnread}</span>
            )}
          </h2>
          {(currentUserRole === 'SUPERADMIN' || currentUserRole === 'SUPERADMINBOSS') && (
            <Link href="/dashboard/conversaciones/configuracion"
              className="text-muted-foreground hover:text-navy transition-colors"
              title="Configurar WhatsApp e IA">
              <Settings className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>

        <nav className="space-y-1">
          <button
            onClick={() => setChannelFilter('all')}
            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md text-sm ${
              channelFilter === 'all' ? 'bg-navy text-white font-medium' : 'hover:bg-slate-100 text-slate-700'
            }`}
          >
            <span className="flex items-center gap-2">📥 Todos</span>
            <span className="text-xs opacity-80">{conversations.length}</span>
          </button>
          {CHANNELS.map(ch => {
            const count = channelCounts.get(ch.value) || 0
            return (
              <button
                key={ch.value}
                onClick={() => setChannelFilter(ch.value)}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md text-sm ${
                  channelFilter === ch.value ? 'bg-navy text-white font-medium' : 'hover:bg-slate-100 text-slate-700'
                }`}
              >
                <span className="flex items-center gap-2">{ch.icon} {ch.label}</span>
                <span className={`text-xs ${channelFilter === ch.value ? 'opacity-80' : 'opacity-60'}`}>{count}</span>
              </button>
            )
          })}
        </nav>

        <h3 className="text-xs font-bold uppercase text-muted-foreground mt-5 mb-2 px-2.5">Estado</h3>
        <nav className="space-y-1">
          <button
            onClick={() => setStatusFilter('all')}
            className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs ${
              statusFilter === 'all' ? 'bg-slate-200 font-medium' : 'hover:bg-slate-100 text-slate-600'
            }`}
          >
            Todos los estados
          </button>
          {CONVERSATION_STATUSES.map(s => (
            <button
              key={s.value}
              onClick={() => setStatusFilter(s.value)}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs ${
                statusFilter === s.value ? 'bg-slate-200 font-medium' : 'hover:bg-slate-100 text-slate-600'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
              {s.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* ── Column 2: Conversation list ─────────────────────────────────────── */}
      <section className="w-80 shrink-0 border-r bg-white flex flex-col">
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar conversación..."
              className="pl-9 h-9"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center p-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center p-10 text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Sin conversaciones</p>
              <p className="text-xs mt-1">Cuando lleguen mensajes aparecerán aquí</p>
            </div>
          ) : (
            <ul className="divide-y">
              {filtered.map(c => {
                const ch = getChannelConfig(c.channel)
                const st = getStatusConfig(c.status)
                const isSelected = c.id === selectedId
                return (
                  <li key={c.id}>
                    <button
                      onClick={() => setSelectedId(c.id)}
                      className={`w-full text-left px-3 py-3 transition-colors ${
                        isSelected ? 'bg-blue-50 border-l-4 border-l-navy' : 'hover:bg-slate-50 border-l-4 border-l-transparent'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm truncate">{c.contact_name || c.contact_phone || 'Sin nombre'}</p>
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <span>{ch.icon}</span> {ch.label}
                            {c.ai_enabled && <Bot className="h-3 w-3 text-purple-500" />}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className="text-[10px] text-muted-foreground">{formatRelative(c.last_message_at)}</span>
                          {c.unread_count > 0 && (
                            <span className="bg-blue-500 text-white text-[10px] min-w-[18px] h-[18px] rounded-full px-1 flex items-center justify-center font-bold">
                              {c.unread_count}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-slate-600 truncate">{c.last_message_preview || '—'}</p>
                      <span className={`inline-block mt-1 text-[9px] px-1.5 py-0.5 rounded ${st.color}`}>{st.label}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </section>

      {/* ── Column 3: Active conversation + lead info ───────────────────────── */}
      <main className="flex-1 flex flex-col bg-slate-50 min-w-0">
        {!activeConversation ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="font-medium">Selecciona una conversación</p>
              <p className="text-sm">o espera a que lleguen nuevos mensajes</p>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 font-semibold text-sm shrink-0">
                  {(activeConversation.contact_name || '?')[0]?.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold truncate">{activeConversation.contact_name || activeConversation.contact_phone || 'Sin nombre'}</p>
                  <p className="text-xs text-muted-foreground">
                    {getChannelConfig(activeConversation.channel).icon} {activeConversation.contact_phone || activeConversation.contact_email}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleAI}
                  className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border transition-colors ${
                    activeConversation.ai_enabled
                      ? 'bg-purple-50 border-purple-200 text-purple-700'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                  title={activeConversation.ai_enabled ? 'IA activa — click para desactivar' : 'IA inactiva — click para activar'}
                >
                  <Bot className="h-3.5 w-3.5" />
                  {activeConversation.ai_enabled ? 'IA ON' : 'IA OFF'}
                </button>
                {activeConversation.status !== 'converted' && (
                  <Button
                    size="sm"
                    onClick={convertToProspecto}
                    disabled={converting}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8"
                  >
                    {converting ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserPlus className="h-3 w-3 mr-1" />}
                    Convertir a Prospecto
                  </Button>
                )}
                {activeConversation.status === 'converted' && (
                  <Badge className="bg-emerald-100 text-emerald-800"><CircleCheck className="h-3 w-3 mr-1" />Convertida</Badge>
                )}
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2">
              {msgLoading ? (
                <div className="flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : messages.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-10">Sin mensajes todavía</p>
              ) : (
                messages.map(m => {
                  const isOut = m.direction === 'outbound'
                  const senderLabel = m.sender_type === 'ai' ? '🤖 IA' : m.sender_type === 'agent' ? '👤 Agente' : null
                  return (
                    <div key={m.id} className={`flex ${isOut ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] rounded-2xl px-3.5 py-2 ${
                        isOut
                          ? m.sender_type === 'ai' ? 'bg-purple-600 text-white' : 'bg-navy text-white'
                          : 'bg-white border text-slate-900'
                      }`}>
                        {senderLabel && <p className="text-[10px] opacity-80 mb-0.5">{senderLabel}</p>}
                        <p className="text-sm whitespace-pre-wrap break-words">{m.content}</p>
                        <p className={`text-[10px] mt-1 flex items-center gap-1 ${isOut ? 'text-white/70 justify-end' : 'text-slate-400'}`}>
                          {formatTime(m.sent_at)}
                          {isOut && m.read_at && <CheckCheck className="h-3 w-3" />}
                          {m.error && <span className="text-red-300" title={m.error}>⚠</span>}
                        </p>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Input */}
            <div className="border-t bg-white p-3">
              <div className="flex gap-2 items-end">
                <textarea
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
                  }}
                  placeholder="Escribe tu respuesta... (Enter para enviar, Shift+Enter para salto de línea)"
                  rows={2}
                  className="flex-1 resize-none rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy"
                  disabled={sending || activeConversation.status === 'closed'}
                />
                <Button
                  onClick={sendMessage}
                  disabled={sending || !draft.trim()}
                  className="bg-navy hover:bg-navy/90 shrink-0 h-10"
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
              {activeConversation.ai_enabled && (
                <p className="text-[10px] text-purple-600 mt-1.5 flex items-center gap-1">
                  <Bot className="h-3 w-3" />
                  Si respondes aquí, la IA se desactiva automáticamente para esta conversación
                </p>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
