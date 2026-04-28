'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { MessageCircle, X, Send, Sparkles } from 'lucide-react'

interface ChatMessage {
  id: string
  direction: 'inbound' | 'outbound'
  sender_type: 'contact' | 'ai' | 'agent' | 'system'
  content: string | null
  sent_at: string
}

const SESSION_KEY = 'altaprop_chat_session_id'
const OPEN_KEY = 'altaprop_chat_open'

function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return ''
  let id = localStorage.getItem(SESSION_KEY)
  if (!id) {
    id = (crypto.randomUUID?.() || `s_${Date.now()}_${Math.random().toString(36).slice(2)}`)
    localStorage.setItem(SESSION_KEY, id)
  }
  return id
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
}

export function LiveChat() {
  const [open, setOpen] = useState(false)
  const [bootstrapped, setBootstrapped] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [aiTyping, setAiTyping] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [hasNewMessage, setHasNewMessage] = useState(false)
  const sessionIdRef = useRef<string>('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Restore "open" state across page navigations on the same site
  useEffect(() => {
    if (typeof window === 'undefined') return
    sessionIdRef.current = getOrCreateSessionId()
    const wasOpen = sessionStorage.getItem(OPEN_KEY) === '1'
    if (wasOpen) setOpen(true)
  }, [])

  // Persist open state
  useEffect(() => {
    if (typeof window === 'undefined') return
    sessionStorage.setItem(OPEN_KEY, open ? '1' : '0')
    if (open) setHasNewMessage(false)
  }, [open])

  // Initialize the conversation when the user first opens the chat
  const init = useCallback(async () => {
    if (bootstrapped) return
    try {
      const res = await fetch('/api/web-chat/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionIdRef.current,
          page_url: typeof window !== 'undefined' ? window.location.href : null,
          referrer: typeof document !== 'undefined' ? document.referrer : null,
          user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
          viewport: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : null,
        }),
      })
      const data = await res.json()
      setConversationId(data.conversation_id || null)
      setMessages(data.messages || [])
      // Show a welcome bubble if no prior messages
      if ((!data.messages || data.messages.length === 0) && data.conversation_id) {
        setMessages([{
          id: 'welcome',
          direction: 'outbound',
          sender_type: 'ai',
          content: '¡Hola! 👋 Soy Sofía, asistente de Altaprop. ¿En qué te puedo ayudar? Cuéntame qué buscas (arriendo, compra, asesoría) y veo cómo apoyarte.',
          sent_at: new Date().toISOString(),
        }])
      }
      setBootstrapped(true)
    } catch (e) {
      console.warn('[live-chat] init failed', e)
    }
  }, [bootstrapped])

  useEffect(() => {
    if (open) init()
  }, [open, init])

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, aiTyping])

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px'
  }, [draft])

  async function send() {
    const text = draft.trim()
    if (!text || sending) return
    setSending(true)
    setAiTyping(true)
    const optimistic: ChatMessage = {
      id: `tmp-${Date.now()}`,
      direction: 'inbound',
      sender_type: 'contact',
      content: text,
      sent_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, optimistic])
    setDraft('')
    try {
      const res = await fetch('/api/web-chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionIdRef.current,
          content: text,
          page_url: typeof window !== 'undefined' ? window.location.href : null,
        }),
      })
      const data = await res.json()
      setMessages(prev => {
        // Replace optimistic with real user_message and append AI reply if any
        const next = prev.filter(m => m.id !== optimistic.id)
        if (data.user_message) next.push(data.user_message)
        if (data.ai_message) next.push(data.ai_message)
        return next
      })
      if (data.ai_message && !open) setHasNewMessage(true)
    } catch (e) {
      console.warn('[live-chat] send failed', e)
    } finally {
      setSending(false)
      setAiTyping(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <>
      {/* ─── Floating launcher ─────────────────────────────────────────── */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Abrir chat con Sofía"
          className="fixed bottom-5 right-5 z-[60] flex items-center gap-2 rounded-full bg-[#1B2A4A] text-white shadow-2xl hover:shadow-[0_8px_30px_rgba(27,42,74,0.45)] transition-all duration-200 hover:scale-105 active:scale-95"
          style={{ paddingLeft: 18, paddingRight: 22, paddingTop: 14, paddingBottom: 14 }}
        >
          <span className="relative">
            <MessageCircle className="h-5 w-5" strokeWidth={2.2} />
            {hasNewMessage && (
              <span className="absolute -top-1 -right-1 h-2.5 w-2.5 bg-red-500 rounded-full ring-2 ring-[#1B2A4A] animate-pulse" />
            )}
          </span>
          <span className="text-sm font-semibold tracking-wide">Chatea con Sofía</span>
        </button>
      )}

      {/* ─── Chat panel ────────────────────────────────────────────────── */}
      {open && (
        <div
          className="fixed inset-0 sm:inset-auto sm:bottom-5 sm:right-5 z-[60] sm:w-[380px] sm:h-[580px] flex flex-col bg-white sm:rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-300"
          role="dialog"
          aria-label="Chat con Sofía"
        >
          {/* Header */}
          <div className="bg-gradient-to-br from-[#1B2A4A] to-[#0F1A33] text-white px-4 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#C4A962] to-[#A38844] flex items-center justify-center text-white font-bold text-base shadow-md">
                  S
                </div>
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 rounded-full ring-2 ring-[#1B2A4A]" />
              </div>
              <div className="leading-tight">
                <p className="font-semibold text-[15px] flex items-center gap-1">
                  Sofía <Sparkles className="h-3.5 w-3.5 text-[#C4A962]" />
                </p>
                <p className="text-[11px] text-slate-300">En línea · Responde al instante</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Cerrar chat"
              className="text-slate-300 hover:text-white hover:bg-white/10 rounded-full p-1.5 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto bg-slate-50 px-3 py-3 space-y-2.5">
            {messages.length === 0 && (
              <div className="text-center text-xs text-slate-500 mt-10">Cargando…</div>
            )}
            {messages.map(m => {
              const isAI = m.direction === 'outbound'
              return (
                <div key={m.id} className={`flex ${isAI ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[80%] ${isAI ? 'bg-white text-slate-800 border border-slate-200 rounded-2xl rounded-tl-sm' : 'bg-[#1B2A4A] text-white rounded-2xl rounded-tr-sm'} px-3.5 py-2 shadow-sm`}>
                    <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{m.content}</p>
                    <p className={`text-[10px] mt-1 ${isAI ? 'text-slate-400' : 'text-white/60'}`}>
                      {formatTime(m.sent_at)}
                    </p>
                  </div>
                </div>
              )
            })}
            {aiTyping && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-3.5 py-2.5 shadow-sm flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t bg-white p-3">
            <div className="flex items-end gap-2 bg-slate-50 rounded-xl border border-slate-200 focus-within:border-[#1B2A4A] focus-within:ring-2 focus-within:ring-[#1B2A4A]/10 transition-colors">
              <textarea
                ref={textareaRef}
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Escribe tu mensaje…"
                rows={1}
                disabled={sending}
                className="flex-1 resize-none bg-transparent border-0 outline-none text-sm py-2.5 px-3 max-h-[120px] placeholder:text-slate-400"
              />
              <button
                onClick={send}
                disabled={sending || !draft.trim()}
                aria-label="Enviar mensaje"
                className="m-1 h-8 w-8 shrink-0 flex items-center justify-center rounded-lg bg-[#1B2A4A] text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#0F1A33] transition-colors"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="text-[10px] text-slate-400 text-center mt-1.5">
              Powered by <span className="font-semibold text-[#1B2A4A]">Altaprop</span> · IA con asesor humano disponible
            </p>
          </div>
        </div>
      )}
    </>
  )
}
