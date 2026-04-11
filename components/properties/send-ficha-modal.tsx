'use client'

import { useState } from 'react'
import { X, Send, Loader2, CheckCircle2, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface SendFichaModalProps {
  propertyId: string
  propertyTitle: string
  onClose: () => void
}

export function SendFichaModal({ propertyId, propertyTitle, onClose }: SendFichaModalProps) {
  const [recipientEmail, setRecipientEmail] = useState('')
  const [recipientName, setRecipientName] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSend() {
    if (!recipientEmail.trim()) { setError('Ingresa un email destinatario'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail.trim())) {
      setError('Email inválido')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/properties/${propertyId}/send-ficha`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientEmail: recipientEmail.trim(), recipientName: recipientName.trim() }),
      })
      const data = await res.json()
      if (data.error) {
        setError(data.error)
      } else {
        setSent(true)
      }
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <X className="h-5 w-5" />
        </button>

        {sent ? (
          <div className="text-center py-4">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-100 mb-4">
              <CheckCircle2 className="h-7 w-7 text-green-600" />
            </div>
            <h2 className="text-lg font-bold text-navy mb-2">¡Ficha enviada!</h2>
            <p className="text-sm text-muted-foreground mb-1">
              Se envió la ficha completa a <strong>{recipientEmail}</strong>
            </p>
            <p className="text-xs text-muted-foreground mb-5">
              El correo incluye toda la información de la propiedad y el PDF adjunto.
            </p>
            <Button className="w-full bg-navy hover:bg-navy/90" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-full bg-navy/10 flex items-center justify-center shrink-0">
                <Mail className="h-5 w-5 text-navy" />
              </div>
              <div>
                <h2 className="text-base font-bold text-navy">Enviar Ficha por Email</h2>
                <p className="text-xs text-muted-foreground line-clamp-1">{propertyTitle}</p>
              </div>
            </div>

            {/* What's included */}
            <div className="bg-navy/5 rounded-lg px-3 py-2.5 mb-4 text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-navy text-[11px] mb-1.5">El correo incluirá:</p>
              {[
                'Logo y datos de tu empresa',
                'Fotos de la propiedad (hasta 6)',
                'Ficha técnica completa',
                'Descripción y amenities',
                'Datos del agente a cargo',
                'PDF adjunto para descargar',
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <div className="w-1 h-1 rounded-full bg-gold shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>

            {/* Form */}
            <div className="space-y-3 mb-5">
              <div className="space-y-1.5">
                <Label className="text-sm">Nombre del destinatario <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                <Input
                  placeholder="Juan Pérez"
                  value={recipientName}
                  onChange={e => setRecipientName(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Email destinatario *</Label>
                <Input
                  type="email"
                  placeholder="interesado@email.com"
                  value={recipientEmail}
                  onChange={e => { setRecipientEmail(e.target.value); setError('') }}
                  disabled={loading}
                  onKeyDown={e => { if (e.key === 'Enter') handleSend() }}
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2 mb-4">
                {error}
              </p>
            )}

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={onClose} disabled={loading}>
                Cancelar
              </Button>
              <Button className="flex-1 bg-navy hover:bg-navy/90" onClick={handleSend} disabled={loading}>
                {loading
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Enviando...</>
                  : <><Send className="h-4 w-4 mr-2" />Enviar Ficha</>
                }
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
