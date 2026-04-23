// Inbox omnicanal — constantes y tipos

export const CHANNELS = [
  { value: 'whatsapp',    label: 'WhatsApp',     icon: '💬', color: 'bg-green-100 text-green-800 border-green-300' },
  { value: 'meta_ads',    label: 'Meta Ads',     icon: '📘', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  { value: 'google_ads',  label: 'Google Ads',   icon: '🔍', color: 'bg-red-100 text-red-800 border-red-300' },
  { value: 'portal',      label: 'Portales',     icon: '🏠', color: 'bg-amber-100 text-amber-800 border-amber-300' },
  { value: 'email',       label: 'Email',        icon: '✉️',  color: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
  { value: 'web',         label: 'Web',          icon: '🌐', color: 'bg-slate-100 text-slate-800 border-slate-300' },
] as const

export const CONVERSATION_STATUSES = [
  { value: 'open',             label: 'Abierta',          color: 'bg-blue-100 text-blue-800',     dot: 'bg-blue-500' },
  { value: 'ai_handling',      label: 'IA respondiendo',  color: 'bg-purple-100 text-purple-800', dot: 'bg-purple-500' },
  { value: 'human_handling',   label: 'Agente',           color: 'bg-amber-100 text-amber-800',   dot: 'bg-amber-500' },
  { value: 'snoozed',          label: 'Pospuesta',        color: 'bg-slate-100 text-slate-700',   dot: 'bg-slate-400' },
  { value: 'closed',           label: 'Cerrada',          color: 'bg-gray-100 text-gray-600',     dot: 'bg-gray-400' },
  { value: 'converted',        label: 'Convertida',       color: 'bg-emerald-100 text-emerald-800', dot: 'bg-emerald-500' },
] as const

export type Channel              = (typeof CHANNELS)[number]['value']
export type ConversationStatus   = (typeof CONVERSATION_STATUSES)[number]['value']
export type MessageDirection     = 'inbound' | 'outbound'
export type MessageSenderType    = 'contact' | 'ai' | 'agent' | 'system'

export function getChannelConfig(channel: string) {
  return CHANNELS.find(c => c.value === channel) || CHANNELS[0]
}
export function getStatusConfig(status: string) {
  return CONVERSATION_STATUSES.find(s => s.value === status) || CONVERSATION_STATUSES[0]
}

export interface Conversation {
  id: string
  subscriber_id: string | null
  agent_id: string | null
  prospecto_id: string | null
  channel: Channel
  external_id: string | null
  contact_name: string | null
  contact_phone: string | null
  contact_email: string | null
  contact_rut: string | null
  status: ConversationStatus
  ai_enabled: boolean
  unread_count: number
  last_message_at: string | null
  last_message_preview: string | null
  last_message_direction: MessageDirection | null
  metadata: Record<string, any>
  created_at: string
  updated_at: string
  // joins
  agent_name?: string | null
  subscriber_name?: string | null
}

export interface Message {
  id: string
  conversation_id: string
  direction: MessageDirection
  sender_type: MessageSenderType
  sender_id: string | null
  content: string | null
  media_url: string | null
  media_type: string | null
  external_id: string | null
  sent_at: string
  delivered_at: string | null
  read_at: string | null
  error: string | null
  metadata: Record<string, any>
}
