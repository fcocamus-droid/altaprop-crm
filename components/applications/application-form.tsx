'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { REQUIRED_DOC_SLOTS, EMPRESA_DOC_SLOTS } from '@/lib/constants'
import { createApplication } from '@/lib/actions/applications'
import { Loader2, Upload, FileText, X, CheckCircle, Plus, UserCheck, ShieldCheck, User, Building2 } from 'lucide-react'

interface ApplicationFormProps {
  propertyId: string
  onSuccess?: () => void
}

interface DocSlot {
  type: string
  label: string
  file: File | null
  section: 'arrendatario' | 'codeudor'
}

export function ApplicationForm({ propertyId, onSuccess }: ApplicationFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [message, setMessage] = useState('')
  const [applicantType, setApplicantType] = useState<'persona' | 'empresa'>('persona')
  const [showCodeudor, setShowCodeudor] = useState(false)

  // Initialize doc slots for arrendatario
  const [arrendatarioDocs, setArrendatarioDocs] = useState<DocSlot[]>(
    REQUIRED_DOC_SLOTS.map(s => ({ type: s.type, label: s.label, file: null, section: 'arrendatario' }))
  )
  const [extraArrendatarioDocs, setExtraArrendatarioDocs] = useState<DocSlot[]>([])

  // Empresa docs
  const [empresaDocs, setEmpresaDocs] = useState<DocSlot[]>(
    EMPRESA_DOC_SLOTS.map(s => ({ type: s.type, label: s.label, file: null, section: 'arrendatario' }))
  )
  const [extraEmpresaDocs, setExtraEmpresaDocs] = useState<DocSlot[]>([])

  const [codeudorDocs, setCodeudorDocs] = useState<DocSlot[]>(
    REQUIRED_DOC_SLOTS.map(s => ({ type: `codeudor_${s.type}`, label: s.label, file: null, section: 'codeudor' }))
  )
  const [extraCodeudorDocs, setExtraCodeudorDocs] = useState<DocSlot[]>([])

  function addExtraDoc(section: 'arrendatario' | 'codeudor' | 'empresa') {
    if (section === 'empresa') {
      const count = extraEmpresaDocs.length
      setExtraEmpresaDocs(prev => [...prev, { type: `empresa_extra_${count}`, label: `Documento Adicional ${count + 1}`, file: null, section: 'arrendatario' }])
      return
    }
    const count = section === 'arrendatario' ? extraArrendatarioDocs.length : extraCodeudorDocs.length
    const newDoc: DocSlot = { type: `${section}_extra_${count}`, label: `Documento Adicional ${count + 1}`, file: null, section }
    if (section === 'arrendatario') {
      setExtraArrendatarioDocs(prev => [...prev, newDoc])
    } else {
      setExtraCodeudorDocs(prev => [...prev, newDoc])
    }
  }

  function handleEmpresaFileSelect(index: number, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null
    setEmpresaDocs(prev => prev.map((d, i) => i === index ? { ...d, file } : d))
    e.target.value = ''
  }

  function removeEmpresaFile(index: number) {
    setEmpresaDocs(prev => prev.map((d, i) => i === index ? { ...d, file: null } : d))
  }

  function handleExtraEmpresaFileSelect(index: number, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null
    setExtraEmpresaDocs(prev => prev.map((d, i) => i === index ? { ...d, file } : d))
    e.target.value = ''
  }

  function removeExtraEmpresaDoc(index: number) {
    setExtraEmpresaDocs(prev => prev.filter((_, i) => i !== index))
  }

  function handleExtraFileSelect(section: 'arrendatario' | 'codeudor', index: number, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null
    if (section === 'arrendatario') {
      setExtraArrendatarioDocs(prev => prev.map((d, i) => i === index ? { ...d, file } : d))
    } else {
      setExtraCodeudorDocs(prev => prev.map((d, i) => i === index ? { ...d, file } : d))
    }
    e.target.value = ''
  }

  function removeExtraDoc(section: 'arrendatario' | 'codeudor', index: number) {
    if (section === 'arrendatario') {
      setExtraArrendatarioDocs(prev => prev.filter((_, i) => i !== index))
    } else {
      setExtraCodeudorDocs(prev => prev.filter((_, i) => i !== index))
    }
  }

  function handleFileSelect(section: 'arrendatario' | 'codeudor', index: number, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null
    if (section === 'arrendatario') {
      setArrendatarioDocs(prev => prev.map((d, i) => i === index ? { ...d, file } : d))
    } else {
      setCodeudorDocs(prev => prev.map((d, i) => i === index ? { ...d, file } : d))
    }
    e.target.value = ''
  }

  function removeFile(section: 'arrendatario' | 'codeudor', index: number) {
    if (section === 'arrendatario') {
      setArrendatarioDocs(prev => prev.map((d, i) => i === index ? { ...d, file: null } : d))
    } else {
      setCodeudorDocs(prev => prev.map((d, i) => i === index ? { ...d, file: null } : d))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const mainDocs = applicantType === 'persona'
      ? [...arrendatarioDocs.filter(d => d.file), ...extraArrendatarioDocs.filter(d => d.file)]
      : [...empresaDocs.filter(d => d.file), ...extraEmpresaDocs.filter(d => d.file)]

    const allDocs = [
      ...mainDocs,
      ...(showCodeudor ? [...codeudorDocs.filter(d => d.file), ...extraCodeudorDocs.filter(d => d.file)] : []),
    ]

    if (allDocs.length === 0) {
      setError('Debes adjuntar al menos un documento del arrendatario')
      return
    }

    setLoading(true)
    setError('')

    const formData = new FormData()
    formData.set('property_id', propertyId)
    formData.set('message', message)
    formData.set('applicant_type', applicantType)
    allDocs.forEach(d => {
      formData.append('documents', d.file!)
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
        <h3 className="font-semibold text-lg">Postulación Enviada</h3>
        <p className="text-muted-foreground text-sm">El corredor revisará tu postulación y te contactará.</p>
      </div>
    )
  }

  const arrendatarioCount = arrendatarioDocs.filter(d => d.file).length + extraArrendatarioDocs.filter(d => d.file).length
  const empresaCount = empresaDocs.filter(d => d.file).length + extraEmpresaDocs.filter(d => d.file).length
  const codeudorCount = codeudorDocs.filter(d => d.file).length + extraCodeudorDocs.filter(d => d.file).length

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
          rows={3}
          required
          minLength={10}
        />
      </div>

      {/* APPLICANT TYPE SELECTOR */}
      <div className="space-y-2">
        <Label>Tipo de postulante *</Label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setApplicantType('persona')}
            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg border-2 text-sm font-medium transition-all ${
              applicantType === 'persona'
                ? 'border-navy bg-navy/5 text-navy ring-2 ring-navy/20'
                : 'border-gray-200 text-gray-500 hover:border-gray-300'
            }`}
          >
            <User className="h-4 w-4" />
            Persona Natural
          </button>
          <button
            type="button"
            onClick={() => setApplicantType('empresa')}
            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg border-2 text-sm font-medium transition-all ${
              applicantType === 'empresa'
                ? 'border-navy bg-navy/5 text-navy ring-2 ring-navy/20'
                : 'border-gray-200 text-gray-500 hover:border-gray-300'
            }`}
          >
            <Building2 className="h-4 w-4" />
            Empresa
          </button>
        </div>
      </div>

      {/* PERSONA NATURAL - ARRENDATARIO SECTION */}
      {applicantType === 'persona' && (
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-navy/5 px-4 py-2.5 flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-navy" />
            <span className="text-sm font-semibold text-navy">Documentos del Arrendatario</span>
            <span className="ml-auto text-xs text-muted-foreground">{arrendatarioCount}/{REQUIRED_DOC_SLOTS.length}</span>
          </div>
          <div className="p-3 space-y-2">
            {arrendatarioDocs.map((slot, i) => (
              <DocSlotRow
                key={slot.type}
                slot={slot}
                index={i}
                section="arrendatario"
                onFileSelect={handleFileSelect}
                onRemove={removeFile}
              />
            ))}
            {extraArrendatarioDocs.map((slot, i) => (
              <DocSlotRow
                key={slot.type}
                slot={slot}
                index={i}
                section="arrendatario"
                onFileSelect={handleExtraFileSelect}
                onRemove={removeExtraDoc}
                isExtra
              />
            ))}
            <button
              type="button"
              onClick={() => addExtraDoc('arrendatario')}
              className="w-full flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground py-1.5 border border-dashed rounded-lg hover:bg-muted/50 transition-colors"
            >
              <Plus className="h-3 w-3" /> Agregar documento adicional
            </button>
          </div>
        </div>
      )}

      {/* EMPRESA SECTION */}
      {applicantType === 'empresa' && (
        <div className="border rounded-lg overflow-hidden border-indigo-200">
          <div className="bg-indigo-50 px-4 py-2.5 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-indigo-700" />
            <span className="text-sm font-semibold text-indigo-800">Documentos de la Empresa</span>
            <span className="ml-auto text-xs text-indigo-500">{empresaCount}/{EMPRESA_DOC_SLOTS.length}</span>
          </div>
          <div className="p-3 space-y-2">
            {empresaDocs.map((slot, i) => (
              <DocSlotRow
                key={slot.type}
                slot={slot}
                index={i}
                section="arrendatario"
                onFileSelect={(_, idx, e) => handleEmpresaFileSelect(idx, e)}
                onRemove={(_, idx) => removeEmpresaFile(idx)}
              />
            ))}
            {extraEmpresaDocs.map((slot, i) => (
              <DocSlotRow
                key={slot.type}
                slot={slot}
                index={i}
                section="arrendatario"
                onFileSelect={(_, idx, e) => handleExtraEmpresaFileSelect(idx, e)}
                onRemove={(_, idx) => removeExtraEmpresaDoc(idx)}
                isExtra
              />
            ))}
            <button
              type="button"
              onClick={() => addExtraDoc('empresa')}
              className="w-full flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground py-1.5 border border-dashed rounded-lg hover:bg-muted/50 transition-colors"
            >
              <Plus className="h-3 w-3" /> Agregar documento adicional
            </button>
          </div>
        </div>
      )}

      {/* CODEUDOR TOGGLE */}
      {!showCodeudor ? (
        <Button
          type="button"
          variant="outline"
          onClick={() => setShowCodeudor(true)}
          className="w-full border-dashed border-2 text-muted-foreground hover:text-foreground"
        >
          <Plus className="mr-2 h-4 w-4" /> Agregar Codeudor (Aval)
        </Button>
      ) : (
        <div className="border rounded-lg overflow-hidden border-amber-200">
          <div className="bg-amber-50 px-4 py-2.5 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-amber-700" />
            <span className="text-sm font-semibold text-amber-800">Documentos del Codeudor (Aval)</span>
            <span className="ml-auto text-xs text-amber-600">{codeudorCount}/{REQUIRED_DOC_SLOTS.length}</span>
            <button type="button" onClick={() => setShowCodeudor(false)} className="text-amber-400 hover:text-amber-600 ml-1">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="p-3 space-y-2">
            {codeudorDocs.map((slot, i) => (
              <DocSlotRow
                key={slot.type}
                slot={slot}
                index={i}
                section="codeudor"
                onFileSelect={handleFileSelect}
                onRemove={removeFile}
              />
            ))}
            {extraCodeudorDocs.map((slot, i) => (
              <DocSlotRow
                key={slot.type}
                slot={slot}
                index={i}
                section="codeudor"
                onFileSelect={handleExtraFileSelect}
                onRemove={removeExtraDoc}
                isExtra
              />
            ))}
            <button
              type="button"
              onClick={() => addExtraDoc('codeudor')}
              className="w-full flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground py-1.5 border border-dashed rounded-lg hover:bg-muted/50 transition-colors"
            >
              <Plus className="h-3 w-3" /> Agregar documento adicional
            </button>
          </div>
        </div>
      )}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Enviar Postulación
      </Button>
    </form>
  )
}

function DocSlotRow({ slot, index, section, onFileSelect, onRemove, isExtra }: {
  slot: DocSlot
  index: number
  section: 'arrendatario' | 'codeudor'
  onFileSelect: (section: 'arrendatario' | 'codeudor', index: number, e: React.ChangeEvent<HTMLInputElement>) => void
  onRemove: (section: 'arrendatario' | 'codeudor', index: number) => void
  isExtra?: boolean
}) {
  const inputId = `doc-${section}-${isExtra ? 'extra-' : ''}${index}`

  return (
    <div className={`flex items-center gap-2 rounded-lg p-2 text-sm ${slot.file ? 'bg-green-50 border border-green-200' : 'bg-muted/50 border border-dashed border-gray-300'}`}>
      {slot.file ? (
        <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
      ) : (
        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p className={`text-xs truncate ${slot.file ? 'font-medium text-green-800' : 'text-muted-foreground'}`}>
          {slot.label}
        </p>
        {slot.file && (
          <p className="text-[10px] text-green-600 truncate">{slot.file.name}</p>
        )}
      </div>
      <input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={(e) => onFileSelect(section, index, e)} className="hidden" id={inputId} />
      {slot.file ? (
        <button type="button" onClick={() => onRemove(section, index)} className="text-red-400 hover:text-red-600 shrink-0">
          <X className="h-4 w-4" />
        </button>
      ) : (
        <Button type="button" variant="outline" size="sm" className="h-7 text-xs shrink-0" onClick={() => document.getElementById(inputId)?.click()}>
          <Upload className="mr-1 h-3 w-3" />Subir
        </Button>
      )}
    </div>
  )
}
