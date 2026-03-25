'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { DOCUMENT_TYPES } from '@/lib/constants'
import { createApplication } from '@/lib/actions/applications'
import { Loader2, Upload, FileText, X, CheckCircle } from 'lucide-react'

interface ApplicationFormProps {
  propertyId: string
  onSuccess?: () => void
}

interface DocFile {
  file: File
  type: string
}

export function ApplicationForm({ propertyId, onSuccess }: ApplicationFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [message, setMessage] = useState('')
  const [docs, setDocs] = useState<DocFile[]>([])

  function addDocument(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    const newDocs = files.map(file => ({ file, type: 'otro' }))
    setDocs(prev => [...prev, ...newDocs])
    e.target.value = ''
  }

  function removeDoc(index: number) {
    setDocs(prev => prev.filter((_, i) => i !== index))
  }

  function updateDocType(index: number, type: string) {
    setDocs(prev => prev.map((d, i) => i === index ? { ...d, type } : d))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (docs.length === 0) {
      setError('Debes adjuntar al menos un documento')
      return
    }
    setLoading(true)
    setError('')

    const formData = new FormData()
    formData.set('property_id', propertyId)
    formData.set('message', message)
    docs.forEach(d => {
      formData.append('documents', d.file)
      formData.append('doc_types', d.type)
    })

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
        <h3 className="font-semibold text-lg">Postulacion Enviada</h3>
        <p className="text-muted-foreground text-sm">El propietario revisara tu postulacion y te contactara.</p>
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
          placeholder="Presentate y explica por que te interesa esta propiedad..."
          rows={4}
          required
          minLength={10}
        />
      </div>

      <div className="space-y-2">
        <Label>Documentos (PDF) *</Label>
        <div className="border-2 border-dashed rounded-lg p-4 text-center">
          <FileText className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
          <p className="text-xs text-muted-foreground mb-2">Sube tu cedula, liquidaciones, contrato, etc.</p>
          <input type="file" accept=".pdf" multiple onChange={addDocument} className="hidden" id="doc-upload" />
          <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById('doc-upload')?.click()}>
            <Upload className="mr-2 h-3 w-3" />Seleccionar PDFs
          </Button>
        </div>
      </div>

      {docs.length > 0 && (
        <div className="space-y-2">
          {docs.map((doc, i) => (
            <div key={i} className="flex items-center gap-2 bg-muted rounded-lg p-2">
              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm truncate flex-1">{doc.file.name}</span>
              <select
                value={doc.type}
                onChange={(e) => updateDocType(i, e.target.value)}
                className="text-xs rounded border px-1 py-0.5 bg-background"
              >
                {DOCUMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <button type="button" onClick={() => removeDoc(i)} className="text-destructive hover:text-destructive/80">
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Enviar Postulacion
      </Button>
    </form>
  )
}
