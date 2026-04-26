// Helpers for the conversations inbox: sound + browser notifications.
// Browser-only — guard `typeof window` checks before calling.

let audioCtx: AudioContext | null = null

function ensureAudioCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  try {
    if (!audioCtx) {
      const Ctor = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext | undefined
      if (!Ctor) return null
      audioCtx = new Ctor()
    }
    return audioCtx
  } catch {
    return null
  }
}

/** Play a short two-tone "ding" using the Web Audio API. No external assets. */
export function playInboxDing() {
  const ctx = ensureAudioCtx()
  if (!ctx) return
  const now = ctx.currentTime
  const tones = [
    { freq: 880, start: 0,    dur: 0.12 },
    { freq: 1320, start: 0.10, dur: 0.16 },
  ]
  for (const t of tones) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = t.freq
    gain.gain.setValueAtTime(0, now + t.start)
    gain.gain.linearRampToValueAtTime(0.18, now + t.start + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.001, now + t.start + t.dur)
    osc.connect(gain).connect(ctx.destination)
    osc.start(now + t.start)
    osc.stop(now + t.start + t.dur)
  }
}

/** Ask the user for permission once. Returns the granted/denied state. */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'denied'
  if (Notification.permission === 'granted' || Notification.permission === 'denied') {
    return Notification.permission
  }
  try {
    return await Notification.requestPermission()
  } catch {
    return 'denied'
  }
}

/** Show a desktop notification if the page is hidden and permission is granted. */
export function notifyNewMessage(opts: {
  title: string
  body: string
  tag?: string                  // dedupes notifications per conversation
  onClick?: () => void
}) {
  if (typeof window === 'undefined' || !('Notification' in window)) return
  if (Notification.permission !== 'granted') return
  // Only show when page isn't visible — otherwise it's noise
  if (document.visibilityState === 'visible') return
  try {
    const n = new Notification(opts.title, {
      body: opts.body,
      tag: opts.tag,
      icon: '/favicon.ico',
      silent: true,           // we play our own sound
    })
    if (opts.onClick) {
      n.onclick = () => {
        window.focus()
        opts.onClick?.()
        n.close()
      }
    }
  } catch {
    /* silent */
  }
}

/** Update document title with unread count prefix: "(3) Conversaciones – Altaprop". */
export function updateTitleBadge(unread: number) {
  if (typeof document === 'undefined') return
  const base = document.title.replace(/^\(\d+\)\s*/, '')
  document.title = unread > 0 ? `(${unread}) ${base}` : base
}
