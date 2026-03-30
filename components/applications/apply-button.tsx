'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { createApplication } from '@/lib/actions/applications'
import { Loader2, Send, CheckCircle } from 'lucide-react'

export function ApplyButton({ propertyId, propertyTitle }: { propertyId: string; propertyTitle: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleApply() {
    setLoading(true)
    setError('')

    const formData = new FormData()
    formData.set('property_id', propertyId)
    formData.set('message', `Postulación a: ${propertyTitle}`)

    const result = await createApplication(formData)

    if (result.error) {
      if (result.error.includes('Ya tienes')) {
        // Already applied, redirect to postulaciones
        router.push('/dashboard/postulaciones')
        return
      }
      setError(result.error)
      setLoading(false)
      return
    }

    router.push('/dashboard/postulaciones')
  }

  return (
    <div className="space-y-2">
      <Button onClick={handleApply} disabled={loading} className="w-full" size="lg">
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
        Postular a esta Propiedad
      </Button>
      {error && (
        <p className="text-xs text-destructive text-center">{error}</p>
      )}
      <p className="text-xs text-muted-foreground text-center">
        Se creará tu postulación y podrás subir documentos desde tu panel
      </p>
    </div>
  )
}
