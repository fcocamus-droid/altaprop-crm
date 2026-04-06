'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Landmark,
  Upload,
  CheckCircle2,
  FileCheck,
  AlertCircle,
  Copy,
  Check,
  Loader2,
  ChevronDown,
  ChevronUp,
  Eye,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface BankInfo {
  bank_name: string | null
  bank_account_type: string | null
  bank_account_holder: string | null
  bank_account_rut: string | null
  bank_account_number: string | null
  bank_email: string | null
}

interface Receipt {
  id: string
  file_url: string
  file_name: string | null
  uploaded_at: string
}

function CopyBtn({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(value)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }}
      className="ml-1 text-muted-foreground hover:text-emerald-600 transition-colors"
      title="Copiar"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  )
}

const ADMIN_ROLES = ['SUPERADMINBOSS', 'SUPERADMIN', 'AGENTE']

interface AgencyBankPanelProps {
  applicationId: string
  userRole?: string
  isApplicant: boolean
}

export function AgencyBankPanel({ applicationId, userRole, isApplicant }: AgencyBankPanelProps) {
  const isOwner = userRole === 'PROPIETARIO'
  const isAdmin = !isApplicant && !isOwner && ADMIN_ROLES.includes(userRole || '')
  const canUpload = isApplicant || isOwner
  const canView = canUpload || isAdmin

  const [bank, setBank] = useState<BankInfo | null>(null)
  const [agencyName, setAgencyName] = useState<string | null>(null)
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!canView) return
    fetch(`/api/applications/${applicationId}/agency-bank-info`)
      .then(r => r.json())
      .then(data => {
        if (data.error) setError(data.error)
        else {
          setBank(data.bank)
          setAgencyName(data.agency_name)
          setReceipts(data.receipts ?? [])
        }
        setLoading(false)
      })
      .catch(() => {
        setError('No se pudo cargar la información de pago')
        setLoading(false)
      })
  }, [applicationId, canView])

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('El archivo supera los 10 MB')
      return
    }

    setUploading(true)
    setUploadError('')
    setUploadSuccess(false)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No autenticado')

      const ext = file.name.split('.').pop()
      const fileName = `${Date.now()}.${ext}`
      const payerLabel = isApplicant ? 'postulante' : 'propietario'
      const filePath = `agency-receipts/${applicationId}/${payerLabel}/${fileName}`

      const { error: uploadErr } = await supabase.storage
        .from('property-images')
        .upload(filePath, file, { upsert: false })
      if (uploadErr) throw new Error(uploadErr.message)

      const { data: urlData } = supabase.storage.from('property-images').getPublicUrl(filePath)

      const { error: dbErr } = await supabase
        .from('payment_receipts')
        .insert({
          application_id: applicationId,
          applicant_id: user.id,
          file_url: urlData.publicUrl,
          file_name: file.name,
        })
      if (dbErr) throw new Error(dbErr.message)

      setReceipts(prev => [
        { id: Date.now().toString(), file_url: urlData.publicUrl, file_name: file.name, uploaded_at: new Date().toISOString() },
        ...prev,
      ])
      setUploadSuccess(true)
      setTimeout(() => setUploadSuccess(false), 4000)
    } catch (err: any) {
      setUploadError(err.message || 'Error al subir el comprobante')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  if (!canView) return null

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Landmark className="h-4 w-4 text-emerald-600 shrink-0" />
          <p className="text-sm font-semibold text-emerald-900">Pago por Transferencia</p>
          {receipts.length > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded-full font-medium bg-emerald-200 text-emerald-800">
              {receipts.length} comprobante{receipts.length !== 1 ? 's' : ''}
            </span>
          )}
          {isAdmin && receipts.length === 0 && !loading && (
            <span className="text-xs px-1.5 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700">
              Sin comprobantes
            </span>
          )}
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-emerald-400 hover:text-emerald-600 transition-colors"
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {expanded && (
        <>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando datos bancarios...
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 rounded-lg p-3">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>
                {error === 'Propiedad sin suscriptor'
                  ? 'No se encontraron datos bancarios de la agencia.'
                  : 'La agencia aún no ha configurado sus datos bancarios.'}
              </span>
            </div>
          ) : bank ? (
            /* Bank details */
            <div className="rounded-lg border border-emerald-200 bg-white p-3 space-y-2 text-sm">
              <p className="text-xs text-emerald-700 font-medium mb-1">
                {isAdmin ? 'Tus datos bancarios (los que ven los pagadores)' : `Datos bancarios de la agencia${agencyName ? ` · ${agencyName}` : ''}`}
              </p>
              {bank.bank_name && (
                <div className="flex justify-between items-center py-1 border-b border-emerald-100">
                  <span className="text-muted-foreground">Banco</span>
                  <span className="font-semibold">{bank.bank_name}</span>
                </div>
              )}
              {bank.bank_account_type && (
                <div className="flex justify-between items-center py-1 border-b border-emerald-100">
                  <span className="text-muted-foreground">Tipo de cuenta</span>
                  <span className="font-semibold">{bank.bank_account_type}</span>
                </div>
              )}
              {bank.bank_account_holder && (
                <div className="flex justify-between items-center py-1 border-b border-emerald-100">
                  <span className="text-muted-foreground">Nombre destinatario</span>
                  <span className="font-semibold flex items-center">
                    {bank.bank_account_holder}
                    <CopyBtn value={bank.bank_account_holder} />
                  </span>
                </div>
              )}
              {bank.bank_account_rut && (
                <div className="flex justify-between items-center py-1 border-b border-emerald-100">
                  <span className="text-muted-foreground">RUT destinatario</span>
                  <span className="font-semibold flex items-center">
                    {bank.bank_account_rut}
                    <CopyBtn value={bank.bank_account_rut} />
                  </span>
                </div>
              )}
              {bank.bank_account_number && (
                <div className="flex justify-between items-center py-1 border-b border-emerald-100">
                  <span className="text-muted-foreground">Número de cuenta</span>
                  <span className="font-semibold flex items-center">
                    {bank.bank_account_number}
                    <CopyBtn value={bank.bank_account_number} />
                  </span>
                </div>
              )}
              {bank.bank_email && (
                <div className="flex justify-between items-center py-1">
                  <span className="text-muted-foreground">Correo electrónico</span>
                  <span className="font-semibold flex items-center">
                    {bank.bank_email}
                    <CopyBtn value={bank.bank_email} />
                  </span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
              {isAdmin
                ? 'No has configurado tus datos bancarios. Ve a Configuración para agregarlos.'
                : 'La agencia aún no ha configurado sus datos bancarios.'}
            </p>
          )}

          {/* Receipts section */}
          <div className="rounded-lg border border-dashed border-emerald-300 bg-white/60 p-3 space-y-2">
            <div className="flex items-center gap-2">
              {isAdmin ? (
                <Eye className="h-4 w-4 text-emerald-600 shrink-0" />
              ) : (
                <FileCheck className="h-4 w-4 text-emerald-600 shrink-0" />
              )}
              <p className="text-sm font-semibold text-emerald-900">
                {isAdmin ? 'Comprobantes recibidos' : 'Comprobante de Transferencia'}
              </p>
            </div>

            {receipts.length > 0 ? (
              <div className="space-y-1.5">
                {receipts.map(r => (
                  <a
                    key={r.id}
                    href={r.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-emerald-700 hover:underline bg-white rounded-lg px-3 py-2 border border-emerald-100"
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span className="truncate">{r.file_name || 'Comprobante'}</span>
                    <span className="text-xs text-muted-foreground ml-auto shrink-0">
                      {new Date(r.uploaded_at).toLocaleDateString('es-CL')}
                    </span>
                  </a>
                ))}
              </div>
            ) : isAdmin ? (
              <p className="text-xs text-muted-foreground italic">
                Aún no se han subido comprobantes de transferencia.
              </p>
            ) : null}

            {/* Upload (POSTULANTE and PROPIETARIO only) */}
            {canUpload && (
              <>
                {uploadSuccess && (
                  <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    Comprobante subido correctamente
                  </div>
                )}
                {uploadError && (
                  <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {uploadError}
                  </div>
                )}

                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={handleUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                  className="gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                >
                  {uploading
                    ? <><Loader2 className="h-4 w-4 animate-spin" />Subiendo...</>
                    : <><Upload className="h-4 w-4" />{receipts.length > 0 ? 'Subir otro comprobante' : 'Subir comprobante de transferencia'}</>
                  }
                </Button>
                <p className="text-xs text-muted-foreground">PDF, JPG, PNG o WebP · Máx 10 MB</p>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
