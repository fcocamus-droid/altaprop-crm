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
  Compass, Building2, UserCheck, FileText, BarChart3, Paperclip, X,
} from 'lucide-react'
import {
  CHANNELS, CONVERSATION_STATUSES, getChannelConfig, getStatusConfig,
  type Conversation, type Message,
} from '@/lib/conversations-constants'
import { createClient } from '@/lib/supabase/client'
import {
  playInboxDing, requestNotificationPermission, notifyNewMessage, updateTitleBadge,
} from '@/lib/inbox/notifications'
import { TemplatePicker } from './template-picker'
import { MediaAttachment } from './media-attachment'

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
  const [assignmentFilter, setAssignmentFilter] = useState<'all' | 'unassigned'>('all')
  const [search, setSearch] = useState('')

  // ── Assignment options (Boss + Subscriber) ─────────────────────────────────
  type AssignSub = { id: string; full_name: string | null; email: string | null }
  type AssignAgent = AssignSub & { subscriber_id: string | null }
  const [assignSubs, setAssignSubs] = useState<AssignSub[]>([])
  const [assignAgents, setAssignAgents] = useState<AssignAgent[]>([])
  const canAssign = currentUserRole === 'SUPERADMINBOSS' || currentUserRole === 'SUPERADMIN'
  useEffect(() => {
    if (!canAssign) return
    fetch('/api/conversations/assign-options')
      .then(r => r.ok ? r.json() : { subscribers: [], agents: [] })
      .then(d => {
        setAssignSubs(d.subscribers || [])
        setAssignAgents(d.agents || [])
      })
      .catch(() => {})
  }, [canAssign])

  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [converting, setConverting] = useState(false)
  const [showTemplatePicker, setShowTemplatePicker] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [pendingPreview, setPendingPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // ── Load conversations ─────────────────────────────────────────────────────
  const searchRef = useRef(search)
  useEffect(() => { searchRef.current = search }, [search])
  async function loadConversations() {
    setLoading(true)
    try {
      const q = searchRef.current.trim()
      const url = q.length >= 2
        ? `/api/conversations?q=${encodeURIComponent(q)}`
        : '/api/conversations'
      const res = await fetch(url)
      const data = await res.json()
      setConversations(data.conversations || [])
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { loadConversations() }, [])
  // Debounce server-side search
  useEffect(() => {
    if (search.trim().length === 0 || search.trim().length >= 2) {
      const t = setTimeout(() => loadConversations(), 250)
      return () => clearTimeout(t)
    }
  }, [search])

  // ── Realtime subscription ──────────────────────────────────────────────────
  // Refs so the subscription doesn't have to re-bind when state changes.
  const selectedIdRef = useRef<string | null>(selectedId)
  const conversationsRef = useRef<Conversation[]>(conversations)
  useEffect(() => { selectedIdRef.current = selectedId }, [selectedId])
  useEffect(() => { conversationsRef.current = conversations }, [conversations])

  useEffect(() => {
    requestNotificationPermission().catch(() => {})
  }, [])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('inbox-realtime')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const msg = payload.new as Message
          // Append to open conversation if relevant (avoid duplicates)
          if (msg.conversation_id === selectedIdRef.current) {
            setMessages(prev => prev.find(x => x.id === msg.id) ? prev : [...prev, msg])
          }
          // New inbound = sound + desktop notification
          if (msg.direction === 'inbound') {
            playInboxDing()
            const conv = conversationsRef.current.find(c => c.id === msg.conversation_id)
            const name = conv?.contact_name || conv?.contact_phone || 'Nuevo mensaje'
            notifyNewMessage({
              title: name,
              body: (msg.content || '').slice(0, 120) || '[multimedia]',
              tag: msg.conversation_id,
              onClick: () => setSelectedId(msg.conversation_id),
            })
          }
          loadConversations()
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages' },
        (payload) => {
          const updated = payload.new as Message
          if (updated.conversation_id === selectedIdRef.current) {
            setMessages(prev => prev.map(m => m.id === updated.id ? updated : m))
          }
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'conversations' },
        () => loadConversations()
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
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
    if (assignmentFilter === 'unassigned') list = list.filter(c => !c.subscriber_id)
    if (channelFilter !== 'all') list = list.filter(c => c.channel === channelFilter)
    if (statusFilter !== 'all') list = list.filter(c => c.status === statusFilter)
    // 1-char search filters locally; >=2 chars uses server-side search (already applied)
    if (search.trim().length === 1) {
      const q = search.toLowerCase()
      list = list.filter(c =>
        (c.contact_name || '').toLowerCase().includes(q) ||
        (c.contact_phone || '').toLowerCase().includes(q) ||
        (c.contact_email || '').toLowerCase().includes(q) ||
        (c.last_message_preview || '').toLowerCase().includes(q)
      )
    }
    return list
  }, [conversations, assignmentFilter, channelFilter, statusFilter, search])

  const totalUnread = conversations.reduce((a, c) => a + (c.unread_count || 0), 0)
  const unassignedCount = conversations.filter(c => !c.subscriber_id).length

  // Meta's 24h customer-service window: free-form text only allowed within 24h
  // of the latest inbound message. After that, only approved templates are
  // accepted.
  const lastInboundAt = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].direction === 'inbound') return messages[i].sent_at
    }
    return null
  }, [messages])
  const windowExpired = useMemo(() => {
    if (!lastInboundAt) return activeConversation?.channel === 'whatsapp' && messages.length > 0
    const hours = (Date.now() - new Date(lastInboundAt).getTime()) / 3600000
    return hours > 24
  }, [lastInboundAt, activeConversation, messages.length])
  useEffect(() => {
    updateTitleBadge(totalUnread)
    return () => updateTitleBadge(0)
  }, [totalUnread])
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

  function handleFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setPendingFile(f)
    if (f.type.startsWith('image/') || f.type.startsWith('video/')) {
      setPendingPreview(URL.createObjectURL(f))
    } else {
      setPendingPreview(null)
    }
    e.target.value = ''
  }

  function clearPending() {
    if (pendingPreview) URL.revokeObjectURL(pendingPreview)
    setPendingPreview(null)
    setPendingFile(null)
  }

  async function sendMedia() {
    if (!pendingFile || !selectedId) return
    setSending(true)
    try {
      const fd = new FormData()
      fd.append('file', pendingFile)
      if (draft.trim()) fd.append('caption', draft.trim())
      const res = await fetch(`/api/conversations/${selectedId}/messages/media`, {
        method: 'POST',
        body: fd,
      })
      const data = await res.json()
      if (data.message) {
        setMessages(prev => [...prev, data.message])
        setDraft('')
        clearPending()
        loadConversations()
      } else if (data.error) {
        alert(data.error)
      }
    } finally {
      setSending(false)
    }
  }

  async function changeStatus(newStatus: string) {
    if (!activeConversation) return
    const prev = activeConversation.status
    setActiveConversation({ ...activeConversation, status: newStatus as any })
    const res = await fetch(`/api/conversations/${activeConversation.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    if (!res.ok) {
      // revert
      setActiveConversation({ ...activeConversation, status: prev })
      const err = await res.json().catch(() => ({}))
      alert(err.error || 'No se pudo cambiar el estado')
    } else {
      loadConversations()
    }
  }

  async function assignSubscriber(subId: string | null) {
    if (!activeConversation) return
    const res = await fetch(`/api/conversations/${activeConversation.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscriber_id: subId, agent_id: null }),
    })
    if (res.ok) {
      const data = await res.json()
      setActiveConversation(data.conversation)
      loadConversations()
    }
  }

  async function assignAgent(agentId: string | null) {
    if (!activeConversation) return
    const res = await fetch(`/api/conversations/${activeConversation.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agent_id: agentId }),
    })
    if (res.ok) {
      const data = await res.json()
      setActiveConversation(data.conversation)
      loadConversations()
    } else {
      const err = await res.json().catch(() => ({}))
      alert(err.error || 'No se pudo asignar el agente')
    }
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
            <div className="flex items-center gap-2">
              <Link href="/dashboard/conversaciones/metricas"
                className="text-muted-foreground hover:text-navy transition-colors"
                title="Métricas">
                <BarChart3 className="h-3.5 w-3.5" />
              </Link>
              <Link href="/dashboard/conversaciones/configuracion"
                className="text-muted-foreground hover:text-navy transition-colors"
                title="Configurar WhatsApp e IA">
                <Settings className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}
        </div>

        {currentUserRole === 'SUPERADMINBOSS' && (
          <>
            <h3 className="text-[10px] font-bold uppercase text-muted-foreground mb-1.5 px-2.5">Bandeja Boss</h3>
            <button
              onClick={() => setAssignmentFilter(assignmentFilter === 'unassigned' ? 'all' : 'unassigned')}
              className={`w-full flex items-center justify-between px-2.5 py-2 mb-3 rounded-md text-sm ${
                assignmentFilter === 'unassigned' ? 'bg-amber-500 text-white font-medium' : 'hover:bg-amber-50 text-amber-700 border border-amber-200'
              }`}
              title="Conversaciones que aún no tienen suscriptor asignado"
            >
              <span className="flex items-center gap-2"><Compass className="h-3.5 w-3.5" /> Sin asignar</span>
              <span className={`text-xs ${assignmentFilter === 'unassigned' ? 'opacity-90' : 'opacity-80'}`}>{unassignedCount}</span>
            </button>
          </>
        )}

        <nav className="space-y-1">
          <button
            onClick={() => { setChannelFilter('all'); setAssignmentFilter('all') }}
            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md text-sm ${
              channelFilter === 'all' && assignmentFilter === 'all' ? 'bg-navy text-white font-medium' : 'hover:bg-slate-100 text-slate-700'
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
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
                    <span>{getChannelConfig(activeConversation.channel).icon} {activeConversation.contact_phone || activeConversation.contact_email}</span>
                    {activeConversation.subscriber_name && (
                      <span className="inline-flex items-center gap-1 text-slate-500">
                        <Building2 className="h-3 w-3" /> {activeConversation.subscriber_name}
                      </span>
                    )}
                    {activeConversation.agent_name && (
                      <span className="inline-flex items-center gap-1 text-slate-500">
                        <UserCheck className="h-3 w-3" /> {activeConversation.agent_name}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                {/* Boss-only: assign subscriber */}
                {currentUserRole === 'SUPERADMINBOSS' && (
                  <select
                    value={activeConversation.subscriber_id || ''}
                    onChange={(e) => assignSubscriber(e.target.value || null)}
                    className="text-xs px-2 py-1.5 rounded-md border bg-white focus:outline-none focus:ring-1 focus:ring-navy"
                    title="Asignar suscriptor"
                  >
                    <option value="">— Sin suscriptor —</option>
                    {assignSubs.map(s => (
                      <option key={s.id} value={s.id}>{s.full_name || s.email}</option>
                    ))}
                  </select>
                )}
                {/* Boss + Subscriber: assign agent (only if a subscriber is set) */}
                {canAssign && activeConversation.subscriber_id && (
                  <select
                    value={activeConversation.agent_id || ''}
                    onChange={(e) => assignAgent(e.target.value || null)}
                    className="text-xs px-2 py-1.5 rounded-md border bg-white focus:outline-none focus:ring-1 focus:ring-navy"
                    title="Asignar agente"
                  >
                    <option value="">— Sin agente —</option>
                    {assignAgents
                      .filter(a => a.subscriber_id === activeConversation.subscriber_id)
                      .map(a => (
                        <option key={a.id} value={a.id}>{a.full_name || a.email}</option>
                      ))}
                  </select>
                )}
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
                <select
                  value={activeConversation.status}
                  onChange={(e) => changeStatus(e.target.value)}
                  className="text-xs px-2 py-1.5 rounded-md border bg-white focus:outline-none focus:ring-1 focus:ring-navy"
                  title="Cambiar estado"
                >
                  {CONVERSATION_STATUSES.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
                {activeConversation.channel === 'whatsapp' && (
                  <button
                    onClick={() => setShowTemplatePicker(true)}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border bg-white hover:bg-emerald-50 text-emerald-700 border-emerald-200 transition-colors"
                    title="Enviar plantilla aprobada por Meta (necesario fuera de la ventana de 24h)"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Plantilla
                  </button>
                )}
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
                        {m.content && <p className="text-sm whitespace-pre-wrap break-words">{m.content}</p>}
                        {m.media_url && (
                          <MediaAttachment
                            url={m.media_url}
                            type={m.media_type}
                            filename={(m.metadata as any)?.original_filename || null}
                            isOutbound={isOut}
                          />
                        )}
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
              {windowExpired && activeConversation.channel === 'whatsapp' && (
                <div className="mb-2 flex items-start gap-2 text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-md px-3 py-2">
                  <FileText className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                  <p>
                    Ventana de 24h expirada. Para retomar el contacto envía una{' '}
                    <button
                      onClick={() => setShowTemplatePicker(true)}
                      className="underline font-medium"
                    >
                      plantilla aprobada
                    </button>
                    .
                  </p>
                </div>
              )}
              {pendingFile && (
                <div className="mb-2 flex items-center gap-2 bg-slate-50 border rounded-md p-2">
                  {pendingPreview && pendingFile.type.startsWith('image/') ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={pendingPreview} alt="preview" className="h-12 w-12 object-cover rounded" />
                  ) : pendingPreview && pendingFile.type.startsWith('video/') ? (
                    <video src={pendingPreview} className="h-12 w-12 object-cover rounded" />
                  ) : (
                    <div className="h-12 w-12 bg-slate-200 rounded flex items-center justify-center">
                      <FileText className="h-5 w-5 text-slate-500" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{pendingFile.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {(pendingFile.size / 1024).toFixed(0)} KB · agrega un mensaje opcional como caption
                    </p>
                  </div>
                  <button onClick={clearPending} className="p-1 hover:bg-slate-200 rounded">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
              <div className="flex gap-2 items-end">
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept="image/*,video/*,audio/*,application/pdf"
                  onChange={handleFilePick}
                />
                {activeConversation.channel === 'whatsapp' && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={sending || activeConversation.status === 'closed'}
                    className="h-10 w-10 shrink-0 flex items-center justify-center rounded-lg border bg-white hover:bg-slate-50 disabled:opacity-50"
                    title="Adjuntar archivo"
                  >
                    <Paperclip className="h-4 w-4 text-slate-600" />
                  </button>
                )}
                <textarea
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      pendingFile ? sendMedia() : sendMessage()
                    }
                  }}
                  placeholder={pendingFile ? 'Caption opcional…' : 'Escribe tu respuesta... (Enter para enviar, Shift+Enter para salto de línea)'}
                  rows={2}
                  className="flex-1 resize-none rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy"
                  disabled={sending || activeConversation.status === 'closed'}
                />
                <Button
                  onClick={pendingFile ? sendMedia : sendMessage}
                  disabled={sending || (!pendingFile && !draft.trim())}
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

      {showTemplatePicker && activeConversation && (
        <TemplatePicker
          conversationId={activeConversation.id}
          subscriberId={activeConversation.subscriber_id}
          contactName={activeConversation.contact_name}
          onClose={() => setShowTemplatePicker(false)}
          onSent={() => {
            if (selectedId) loadConversation(selectedId)
            loadConversations()
          }}
        />
      )}
    </div>
  )
}
