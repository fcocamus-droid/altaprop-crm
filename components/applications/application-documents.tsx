'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { REQUIRED_DOC_SLOTS, EMPRESA_DOC_SLOTS } from '@/lib/constants'
import { uploadApplicationDocument, deleteApplicationDocument, updateApplicationStatus } from '@/lib/actions/applications'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Upload, FileText, X, CheckCircle, Plus, UserCheck, ShieldCheck, User, Building2, Download } from 'lucide-react'

interface ExistingDoc {
  id: string
  name: string
  url: string
  type: string
}

export function ApplicationDocuments({ applicationId, readOnly = false, onAllDocsUploaded, onDocCountChange, onStatusChange }: { applicationId: string; readOnly?: boolean; onAllDocsUploaded?: () => void; onDocCountChange?: (count: number) => void; onStatusChange?: (status: string) => void }) {
  const [applicantType, setApplicantType] = useState<'persona' | 'empresa'>('persona')
  const [showCodeudor, setShowCodeudor] = useState(false)
  const [existingDocs, setExistingDocs] = useState<ExistingDoc[]>([])
  const [uploading, setUploading] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  // Load existing documents
  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data } = await supabase
        .from('application_documents')
        .select('id, name, url, type')
        .eq('application_id', applicationId)
        .order('created_at')
      if (data) {
        setExistingDocs(data)
        // Auto-detect type from existing docs
        if (data.some(d => d.type?.startsWith('emp_'))) setApplicantType('empresa')
        if (data.some(d => d.type?.startsWith('codeudor_'))) setShowCodeudor(true)
      }
    }
    load()
  }, [applicationId])

  async function handleUpload(docType: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    setUploading(docType)

    // Delete existing doc of same type first (allows re-upload/correction)
    const existing = existingDocs.find(d => d.type === docType)
    if (existing) {
      await deleteApplicationDocument(existing.id)
      setExistingDocs(prev => prev.filter(d => d.id !== existing.id))
    }

    const formData = new FormData()
    formData.set('file', file)
    formData.set('doc_type', docType)

    const result = await uploadApplicationDocument(applicationId, formData)
    if (result.success && result.document) {
      setExistingDocs(prev => {
        const updated = [...prev, result.document as ExistingDoc]
        onDocCountChange?.(updated.length)
        return updated
      })
    }
    setUploading(null)
  }

  async function handleDelete(docId: string) {
    setDeleting(docId)
    const result = await deleteApplicationDocument(docId)
    if (result.success) {
      setExistingDocs(prev => {
        const updated = prev.filter(d => d.id !== docId)
        onDocCountChange?.(updated.length)
        return updated
      })
    }
    setDeleting(null)
  }

  function getExistingDoc(docType: string): ExistingDoc | undefined {
    return existingDocs.find(d => d.type === docType)
  }

  // Notify doc count on load
  useEffect(() => {
    onDocCountChange?.(existingDocs.length)
  }, [existingDocs.length, onDocCountChange])

  const allRequiredUploaded = (() => {
    const slots = applicantType === 'persona' ? REQUIRED_DOC_SLOTS : EMPRESA_DOC_SLOTS
    return slots.every(s => existingDocs.some(d => d.type === s.type))
  })()

  const personaSlots = REQUIRED_DOC_SLOTS
  const empresaSlots = EMPRESA_DOC_SLOTS
  const codeudorSlots = REQUIRED_DOC_SLOTS.map(s => ({ type: `codeudor_${s.type}`, label: s.label }))

  const mainSlots = applicantType === 'persona' ? personaSlots : empresaSlots
  const mainCount = mainSlots.filter(s => getExistingDoc(s.type)).length
  const codeudorCount = codeudorSlots.filter(s => getExistingDoc(s.type)).length

  // Extra docs that don't match any slot
  const knownTypes = new Set([
    ...personaSlots.map(s => s.type),
    ...empresaSlots.map(s => s.type),
    ...codeudorSlots.map(s => s.type),
  ])
  const extraDocs = existingDocs.filter(d => !knownTypes.has(d.type))

  return (
    <div className="space-y-4">
      {/* TYPE SELECTOR */}
      {!readOnly && (
        <div className="space-y-2">
          <Label>Tipo de postulante</Label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setApplicantType('persona')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg border-2 text-sm font-medium transition-all ${
                applicantType === 'persona'
                  ? 'border-navy bg-navy/5 text-navy ring-2 ring-navy/20'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              <User className="h-4 w-4" /> Persona Natural
            </button>
            <button
              type="button"
              onClick={() => setApplicantType('empresa')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg border-2 text-sm font-medium transition-all ${
                applicantType === 'empresa'
                  ? 'border-navy bg-navy/5 text-navy ring-2 ring-navy/20'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              <Building2 className="h-4 w-4" /> Empresa
            </button>
          </div>
        </div>
      )}

      {/* MAIN DOCUMENTS SECTION */}
      <div className="border rounded-lg overflow-hidden">
        <div className={`px-4 py-2.5 flex items-center gap-2 ${applicantType === 'empresa' ? 'bg-indigo-50' : 'bg-navy/5'}`}>
          {applicantType === 'persona'
            ? <><UserCheck className="h-4 w-4 text-navy" /><span className="text-sm font-semibold text-navy">Documentos del Arrendatario</span></>
            : <><Building2 className="h-4 w-4 text-indigo-700" /><span className="text-sm font-semibold text-indigo-800">Documentos de la Empresa</span></>
          }
          <span className="ml-auto text-xs text-muted-foreground">{mainCount}/{mainSlots.length}</span>
        </div>
        <div className="p-3 space-y-2">
          {mainSlots.map(slot => (
            <DocSlotRow
              key={slot.type}
              docType={slot.type}
              label={slot.label}
              existingDoc={getExistingDoc(slot.type)}
              uploading={uploading === slot.type}
              deleting={deleting}
              readOnly={readOnly}
              onUpload={handleUpload}
              onDelete={handleDelete}
            />
          ))}
          {!readOnly && (
            <ExtraUploadButton
              sectionPrefix={applicantType === 'persona' ? 'extra' : 'emp_extra'}
              existingDocs={extraDocs.filter(d => !d.type.startsWith('codeudor_'))}
              uploading={uploading}
              deleting={deleting}
              onUpload={handleUpload}
              onDelete={handleDelete}
            />
          )}
        </div>
      </div>

      {/* CODEUDOR SECTION */}
      {!readOnly && !showCodeudor ? (
        <Button
          type="button"
          variant="outline"
          onClick={() => setShowCodeudor(true)}
          className="w-full border-dashed border-2 text-muted-foreground hover:text-foreground"
        >
          <Plus className="mr-2 h-4 w-4" /> Agregar Codeudor (Aval)
        </Button>
      ) : (showCodeudor || existingDocs.some(d => d.type.startsWith('codeudor_'))) && (
        <div className="border rounded-lg overflow-hidden border-amber-200">
          <div className="bg-amber-50 px-4 py-2.5 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-amber-700" />
            <span className="text-sm font-semibold text-amber-800">Documentos del Codeudor (Aval)</span>
            <span className="ml-auto text-xs text-amber-600">{codeudorCount}/{codeudorSlots.length}</span>
            {!readOnly && (
              <button type="button" onClick={() => setShowCodeudor(false)} className="text-amber-400 hover:text-amber-600 ml-1">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="p-3 space-y-2">
            {codeudorSlots.map(slot => (
              <DocSlotRow
                key={slot.type}
                docType={slot.type}
                label={slot.label}
                existingDoc={getExistingDoc(slot.type)}
                uploading={uploading === slot.type}
                deleting={deleting}
                readOnly={readOnly}
                onUpload={handleUpload}
                onDelete={handleDelete}
              />
            ))}
            {!readOnly && (
              <ExtraUploadButton
                sectionPrefix="codeudor_extra"
                existingDocs={extraDocs.filter(d => d.type.startsWith('codeudor_'))}
                uploading={uploading}
                deleting={deleting}
                onUpload={handleUpload}
                onDelete={handleDelete}
              />
            )}
          </div>
        </div>
      )}

      {/* LISTO BUTTON - only for postulante */}
      {!readOnly && (
        <div className="pt-2">
          {submitted ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="font-semibold text-green-800">Documentos enviados a revisión</p>
              <p className="text-xs text-green-600 mt-1">El corredor revisará tus documentos y te contactará</p>
            </div>
          ) : allRequiredUploaded ? (
            <Button
              type="button"
              disabled={submitting}
              onClick={async () => {
                setSubmitting(true)
                const result = await updateApplicationStatus(applicationId, 'reviewing')
                if (!result.error) {
                  setSubmitted(true)
                  onStatusChange?.('reviewing')
                  onAllDocsUploaded?.()
                }
                setSubmitting(false)
              }}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3"
            >
              {submitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Enviando...</>
              ) : (
                <><CheckCircle className="mr-2 h-4 w-4" />Documentos Listos — Enviar a Revisión</>
              )}
            </Button>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
              <p className="text-sm text-amber-700">
                Sube todos los documentos requeridos <strong>({mainCount}/{mainSlots.length})</strong> para enviar a revisión
              </p>
            </div>
          )}
        </div>
      )}

      {/* Read-only extra docs */}
      {readOnly && extraDocs.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-muted/50 px-4 py-2.5">
            <span className="text-sm font-semibold">Documentos Adicionales</span>
          </div>
          <div className="p-3 space-y-2">
            {extraDocs.map(doc => (
              <div key={doc.id} className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg p-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-green-800 truncate">{doc.name}</p>
                </div>
                <DownloadButton url={doc.url} name={doc.name} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function DocSlotRow({ docType, label, existingDoc, uploading, deleting, readOnly, onUpload, onDelete }: {
  docType: string
  label: string
  existingDoc?: ExistingDoc
  uploading: boolean
  deleting: string | null
  readOnly: boolean
  onUpload: (type: string, e: React.ChangeEvent<HTMLInputElement>) => void
  onDelete: (id: string) => void
}) {
  const inputId = `upload-${docType}`
  const isDeleting = existingDoc && deleting === existingDoc.id

  if (existingDoc) {
    return (
      <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg p-2 text-sm">
        <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-green-800 truncate">{label}</p>
          <p className="text-[10px] text-green-600 truncate">{existingDoc.name}</p>
        </div>
        <DownloadButton url={existingDoc.url} name={existingDoc.name} />
        {!readOnly && (
          <button
            type="button"
            onClick={() => onDelete(existingDoc.id)}
            disabled={!!isDeleting}
            className="text-red-400 hover:text-red-600 shrink-0 disabled:opacity-50"
          >
            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
          </button>
        )}
      </div>
    )
  }

  if (readOnly) {
    return (
      <div className="flex items-center gap-2 bg-muted/50 border border-dashed border-gray-300 rounded-lg p-2 text-sm">
        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
        <p className="text-xs text-muted-foreground flex-1">{label}</p>
        <span className="text-[10px] text-muted-foreground">Pendiente</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 bg-muted/50 border border-dashed border-gray-300 rounded-lg p-2 text-sm">
      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
      <p className="text-xs text-muted-foreground flex-1 truncate">{label}</p>
      <input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={(e) => onUpload(docType, e)} className="hidden" id={inputId} />
      {uploading ? (
        <Loader2 className="h-4 w-4 animate-spin text-navy shrink-0" />
      ) : (
        <Button type="button" variant="outline" size="sm" className="h-7 text-xs shrink-0" onClick={() => document.getElementById(inputId)?.click()}>
          <Upload className="mr-1 h-3 w-3" />Subir
        </Button>
      )}
    </div>
  )
}

function ExtraUploadButton({ sectionPrefix, existingDocs, uploading, deleting, onUpload, onDelete }: {
  sectionPrefix: string
  existingDocs: ExistingDoc[]
  uploading: string | null
  deleting: string | null
  onUpload: (type: string, e: React.ChangeEvent<HTMLInputElement>) => void
  onDelete: (id: string) => void
}) {
  const extraType = `${sectionPrefix}_${Date.now()}`
  const inputId = `extra-${sectionPrefix}`

  return (
    <>
      {existingDocs.map(doc => (
        <div key={doc.id} className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg p-2 text-sm">
          <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-green-800 truncate">Documento Adicional</p>
            <p className="text-[10px] text-green-600 truncate">{doc.name}</p>
          </div>
          <a href={doc.url} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="h-7 text-xs shrink-0"><Download className="mr-1 h-3 w-3" />Ver</Button>
          </a>
          <button
            type="button"
            onClick={() => onDelete(doc.id)}
            disabled={deleting === doc.id}
            className="text-red-400 hover:text-red-600 shrink-0 disabled:opacity-50"
          >
            {deleting === doc.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
          </button>
        </div>
      ))}
      <input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={(e) => onUpload(`${sectionPrefix}_${Date.now()}`, e)} className="hidden" id={inputId} />
      <button
        type="button"
        onClick={() => document.getElementById(inputId)?.click()}
        className="w-full flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground py-1.5 border border-dashed rounded-lg hover:bg-muted/50 transition-colors"
      >
        <Plus className="h-3 w-3" /> Agregar documento adicional
      </button>
    </>
  )
}

function DownloadButton({ url, name }: { url: string; name: string }) {
  const downloadUrl = `/api/download?url=${encodeURIComponent(url)}&name=${encodeURIComponent(name)}`
  return (
    <a href={downloadUrl}>
      <Button variant="outline" size="sm" className="h-7 text-xs shrink-0">
        <Download className="mr-1 h-3 w-3" />Descargar
      </Button>
    </a>
  )
}
