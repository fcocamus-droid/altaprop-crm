'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { createApplication } from '@/lib/actions/applications'
import { Loader2, CheckCircle, Send } from 'lucide-react'
import Link from 'next/link'

interface ApplicationFormProps {
  propertyId: string
  onSuccess?: () => void
}

export function ApplicationForm({ propertyId, onSuccess }: ApplicationFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [message, setMessage] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData()
    formData.set('property_id', propertyId)
    formData.set('message', message)

    const result = await createApplication(formData)
    if (result.error) {
      setError(result.error)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
    onSuccess?.()
  }

  if (success) {
    return (
      <div className="text-center py-6 space-y-3">
        <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
        <h3 className="font-semibold text-lg">Postulación Enviada</h3>
        <p className="text-muted-foreground text-sm">
          Ahora ve a tu panel para completar tus documentos y que el corredor pueda evaluar tu postulación.
        </p>
        <Button asChild className="w-full">
          <Link href="/dashboard/postulaciones">Ir a Mi Panel</Link>
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">{error}</div>
      )}

      <div className="space-y-2">
        <Label>Mensaje al propietario *</Label>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Preséntate y explica por qué te interesa esta propiedad..."
          rows={4}
          required
          minLength={10}
        />
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
        Después de postular, podrás subir tus documentos desde tu panel de postulante.
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
        Enviar Postulación
      </Button>
    </form>
  )
}
