'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Landmark, Upload, CheckCircle2, FileCheck, AlertCircle, Copy, Check } from 'lucide-react'
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

interface PaymentInfo {
  property_title: string
  owner_name: string | null
  bank: BankInfo | null
  receipts: Receipt[]
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(value)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }}
      className="ml-1 text-muted-foreground hover:text-navy transition-colors"
      title="Copiar"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  )
}

const ADMIN_ROLES = ['SUPERADMINBOSS', 'SUPERADMIN', 'AGENTE']

export function PaymentPanel({
  applicationId,
  canUpload = true,
  userRole,
}: {
  applicationId: string
  canUpload?: boolean
  userRole?: string
}) {
  // Admins and propietario can view receipts in read-only mode
  const canViewReceipts = canUpload || userRole === 'PROPIETARIO' || ADMIN_ROLES.includes(userRole || '')
  const [info, setInfo] = useState<PaymentInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch(`/api/applications/${applicationId}/payment-info`)
      .then(r => r.json())
      .then(data => {
        if (data.error) setError(data.error)
        else setInfo(data)
        setLoading(false)
      })
      .catch(() => {
        setError('No se pudo cargar la información de pago')
        setLoading(false)
      })
  }, [applicationId])

  async function handleReceiptUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setUploadError('')
    setUploadSuccess(false)

    try {
      const supabase = createClient()

      // Get current user id
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No autenticado')

      // Upload to storage
      const ext = file.name.split('.').pop()
      const fileName = `${Date.now()}.${ext}`
      const filePath = `payment-receipts/${applicationId}/${fileName}`

      const { error: uploadErr } = await supabase.storage
        .from('property-images')
        .upload(filePath, file, { upsert: false })

      if (uploadErr) throw new Error(uploadErr.message)

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('property-images')
        .getPublicUrl(filePath)

      // Save receipt record
      const { error: dbErr } = await supabase
        .from('payment_receipts')
        .insert({
          application_id: applicationId,
          applicant_id: user.id,
          file_url: urlData.publicUrl,
          file_name: file.name,
        })

      if (dbErr) throw new Error(dbErr.message)

      // Update local state
      setInfo(prev => prev ? {
        ...prev,
        receipts: [
          {
            id: Date.now().toString(),
            file_url: urlData.publicUrl,
            file_name: file.name,
            uploaded_at: new Date().toISOString(),
          },
          ...prev.receipts,
        ],
      } : prev)

      setUploadSuccess(true)
      setTimeout(() => setUploadSuccess(false), 4000)
    } catch (err: any) {
      setUploadError(err.message || 'Error al subir el comprobante')
    }

    setUploading(false)
    // Reset input
    if (fileRef.current) fileRef.current.value = ''
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Cargando información de pago...
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 rounded-lg p-3">
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span>{error === 'La propiedad no tiene propietario asignado'
          ? 'El propietario aún no ha sido asignado a esta propiedad.'
          : error === 'Propietario sin datos bancarios'
          ? 'El propietario aún no ha configurado sus datos bancarios.'
          : error}</span>
      </div>
    )
  }

  if (!info) return null

  return (
    <div className="space-y-4">
      {/* Bank details card */}
      <div className="rounded-xl border border-navy/20 bg-navy/5 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-navy text-white flex items-center justify-center shrink-0">
            <Landmark className="h-4 w-4" />
          </div>
          <div>
            <p className="font-semibold text-navy text-sm">Datos para el Pago</p>
            <p className="text-xs text-muted-foreground">Transfiere al propietario para confirmar tu operación</p>
          </div>
        </div>

        {info.bank ? (
          <div className="grid grid-cols-1 gap-2 text-sm">
            {info.bank.bank_name && (
              <div className="flex justify-between items-center py-1.5 border-b border-navy/10">
                <span className="text-muted-foreground font-medium">Banco</span>
                <span className="font-semibold">{info.bank.bank_name}</span>
              </div>
            )}
            {info.bank.bank_account_type && (
              <div className="flex justify-between items-center py-1.5 border-b border-navy/10">
                <span className="text-muted-foreground font-medium">Tipo de cuenta</span>
                <span className="font-semibold">{info.bank.bank_account_type}</span>
              </div>
            )}
            {info.bank.bank_account_holder && (
              <div className="flex justify-between items-center py-1.5 border-b border-navy/10">
                <span className="text-muted-foreground font-medium">Nombre destinatario</span>
                <span className="font-semibold flex items-center">
                  {info.bank.bank_account_holder}
                  <CopyButton value={info.bank.bank_account_holder} />
                </span>
              </div>
            )}
            {info.bank.bank_account_rut && (
              <div className="flex justify-between items-center py-1.5 border-b border-navy/10">
                <span className="text-muted-foreground font-medium">RUT destinatario</span>
                <span className="font-semibold flex items-center">
                  {info.bank.bank_account_rut}
                  <CopyButton value={info.bank.bank_account_rut} />
                </span>
              </div>
            )}
            {info.bank.bank_account_number && (
              <div className="flex justify-between items-center py-1.5 border-b border-navy/10">
                <span className="text-muted-foreground font-medium">Número de cuenta</span>
                <span className="font-semibold flex items-center">
                  {info.bank.bank_account_number}
                  <CopyButton value={info.bank.bank_account_number} />
                </span>
              </div>
            )}
            {info.bank.bank_email && (
              <div className="flex justify-between items-center py-1.5">
                <span className="text-muted-foreground font-medium">Correo electrónico</span>
                <span className="font-semibold flex items-center">
                  {info.bank.bank_email}
                  <CopyButton value={info.bank.bank_email} />
                </span>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
            El propietario aún no ha configurado sus datos bancarios. Comunícate con tu agente.
          </p>
        )}
      </div>

      {/* Receipt section — visible to postulante (upload) and admins/propietario (read-only) */}
      {canViewReceipts && (
        <div className="rounded-xl border border-dashed border-muted-foreground/30 bg-muted/20 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <FileCheck className="h-4 w-4 text-muted-foreground shrink-0" />
            <p className="text-sm font-semibold">Comprobante de Pago</p>
          </div>

          {/* Existing receipts */}
          {info.receipts.length > 0 ? (
            <div className="space-y-2">
              {info.receipts.map(r => (
                <a
                  key={r.id}
                  href={r.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-navy hover:underline bg-white rounded-lg px-3 py-2 border border-navy/10"
                >
                  <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                  <span className="truncate">{r.file_name || 'Comprobante'}</span>
                  <span className="text-xs text-muted-foreground ml-auto shrink-0">
                    {new Date(r.uploaded_at).toLocaleDateString('es-CL')}
                  </span>
                </a>
              ))}
            </div>
          ) : !canUpload ? (
            <p className="text-xs text-muted-foreground italic">El postulante aún no ha subido comprobantes.</p>
          ) : null}

          {/* Upload controls — only for postulante */}
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
                onChange={handleReceiptUpload}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
                className="gap-2"
              >
                {uploading
                  ? <><Loader2 className="h-4 w-4 animate-spin" />Subiendo...</>
                  : <><Upload className="h-4 w-4" />{info.receipts.length > 0 ? 'Subir otro comprobante' : 'Subir comprobante de pago'}</>
                }
              </Button>
              <p className="text-xs text-muted-foreground">PDF, JPG o PNG. Máx 10MB</p>
            </>
          )}
        </div>
      )}
    </div>
  )
}
