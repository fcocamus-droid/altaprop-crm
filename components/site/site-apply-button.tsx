'use client'

import { useState } from 'react'
import { User, Mail, Phone, FileText, MessageSquare, CheckCircle, Loader2, ChevronRight, X } from 'lucide-react'
import { formatRut } from '@/lib/validations/chilean-formats'

interface Props {
  propertyId: string
  primaryColor: string
  accentColor: string
}

export function SiteApplyButton({ propertyId, primaryColor, accentColor }: Props) {
  const [open, setOpen]   = useState(false)
  const [form, setForm]   = useState({ fullName: '', rut: '', email: '', phone: '', message: '' })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError]     = useState('')

  function set(field: string, value: string) {
    setForm(p => ({ ...p, [field]: field === 'rut' ? formatRut(value) : value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.fullName || !form.email) { setError('Nombre y email son obligatorios'); return }

    setLoading(true); setError('')
    try {
      const res = await fetch('/api/public/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId, ...form }),
      })
      const data = await res.json()
      if (data.error) setError(data.error)
      else setSuccess(true)
    } catch { setError('Error al enviar. Intenta de nuevo.') }
    setLoading(false)
  }

  if (success) {
    return (
      <div className="rounded-xl border-2 border-green-200 bg-green-50 p-4 text-center">
        <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
        <p className="text-sm font-semibold text-green-800">¡Postulación enviada!</p>
        <p className="text-xs text-green-700 mt-1">
          Nos pondremos en contacto a <strong>{form.email}</strong> a la brevedad.
        </p>
      </div>
    )
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center justify-between w-full py-3 px-4 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
        style={{ background: primaryColor }}
      >
        <span className="flex items-center gap-2">
          <User className="h-4 w-4" />
          Postular a esta propiedad
        </span>
        <ChevronRight className="h-4 w-4" />
      </button>
    )
  }

  return (
    <div className="rounded-xl border-2 p-4 space-y-4" style={{ borderColor: primaryColor + '40' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: primaryColor }}>
          <User className="h-4 w-4" style={{ color: accentColor }} />
          Postular a esta propiedad
        </h3>
        <button type="button" onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
          <X className="h-4 w-4" />
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-2 rounded-lg">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="text-xs font-medium text-gray-600 flex items-center gap-1 mb-1">
            <User className="h-3 w-3" /> Nombre Completo *
          </label>
          <input
            value={form.fullName} onChange={e => set('fullName', e.target.value)}
            placeholder="Juan Pérez González" required
            className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-medium text-gray-600 flex items-center gap-1 mb-1">
              <FileText className="h-3 w-3" /> RUT
            </label>
            <input
              value={form.rut} onChange={e => set('rut', e.target.value)}
              placeholder="12.345.678-9" maxLength={12}
              className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 flex items-center gap-1 mb-1">
              <Phone className="h-3 w-3" /> Teléfono
            </label>
            <input
              value={form.phone} onChange={e => set('phone', e.target.value)}
              placeholder="+56 9 1234 5678"
              className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-600 flex items-center gap-1 mb-1">
            <Mail className="h-3 w-3" /> Email *
          </label>
          <input
            type="email" value={form.email} onChange={e => set('email', e.target.value)}
            placeholder="juan@email.com" required
            className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-gray-600 flex items-center gap-1 mb-1">
            <MessageSquare className="h-3 w-3" /> Mensaje (opcional)
          </label>
          <textarea
            value={form.message} onChange={e => set('message', e.target.value)}
            placeholder="Me interesa esta propiedad porque..."
            rows={3}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm resize-none focus:outline-none"
          />
        </div>

        <button
          type="submit" disabled={loading}
          className="w-full py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-60"
          style={{ background: primaryColor }}
        >
          {loading
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</>
            : <><User className="h-4 w-4" /> Enviar Postulación</>
          }
        </button>
        <p className="text-xs text-gray-500 text-center">
          Tu información es confidencial y solo será compartida con el agente.
        </p>
      </form>
    </div>
  )
}
