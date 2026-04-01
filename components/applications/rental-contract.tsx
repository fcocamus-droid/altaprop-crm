'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { saveRentalContract, deleteRentalContract } from '@/lib/actions/applications'
import { FileText, Upload, Loader2, Trash2, Download, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface RentalContractProps {
  applicationId: string
  initialUrl?: string | null
  initialName?: string | null
  canManage: boolean   // true for admin/agente, false for postulante
  onContractChange?: (url: string | null, name: string | null) => void
}

export function RentalContract({
  applicationId,
  initialUrl,
  initialName,
  canManage,
  onContractChange,
}: RentalContractProps) {
  const [contractUrl, setContractUrl]   = useState<string | null>(initialUrl || null)
  const [contractName, setContractName] = useState<string | null>(initialName || null)
  const [uploading, setUploading]       = useState(false)
  const [deleting, setDeleting]         = useState(false)
  const [error, setError]               = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleUpload(file: File) {
    if (!file) return
    const ext = file.name.split('.').pop()?.toLowerCase()
    const allowed = ['pdf', 'doc', 'docx']
    if (!allowed.includes(ext || '')) {
      setError('Solo se permiten archivos PDF, DOC o DOCX')
      return
    }
    if (file.size > 20 * 1024 * 1024) {
      setError('El archivo no puede superar 20 MB')
      return
    }

    setUploading(true)
    setError(null)

    try {
      const supabase = createClient()
      const fileName = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`
      const filePath = `rental-contracts/${applicationId}/${fileName}`

      const { error: uploadErr } = await supabase.storage
        .from('property-images')
        .upload(filePath, file, { upsert: true })

      if (uploadErr) throw new Error(uploadErr.message)

      const { data: urlData } = supabase.storage
        .from('property-images')
        .getPublicUrl(filePath)

      const publicUrl = urlData.publicUrl

      const result = await saveRentalContract(applicationId, publicUrl, file.name)
      if (result.error) throw new Error(result.error)

      setContractUrl(publicUrl)
      setContractName(file.name)
      onContractChange?.(publicUrl, file.name)
    } catch (e: any) {
      setError(e.message || 'Error al subir el archivo')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function handleDelete() {
    if (!contractUrl) return
    if (!confirm('¿Eliminar el contrato adjunto? Esta acción no se puede deshacer.')) return
    setDeleting(true)
    setError(null)
    const result = await deleteRentalContract(applicationId, contractUrl)
    if (result.error) {
      setError(result.error)
    } else {
      setContractUrl(null)
      setContractName(null)
      onContractChange?.(null, null)
    }
    setDeleting(false)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-navy shrink-0" />
        <p className="text-sm font-semibold text-navy">Contrato de Arriendo</p>
      </div>

      {contractUrl ? (
        /* ── Contract exists ── */
        <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
              <FileText className="h-4 w-4 text-blue-700" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-blue-900 truncate">
                {contractName || 'Contrato adjunto'}
              </p>
              <p className="text-xs text-blue-600">Documento cargado</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <a
              href={contractUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-900 bg-white border border-blue-200 hover:border-blue-400 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              Descargar
            </a>
            {canManage && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => inputRef.current?.click()}
                  disabled={uploading || deleting}
                  className="text-xs text-muted-foreground hover:text-navy h-8 px-2"
                  title="Reemplazar contrato"
                >
                  <Upload className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDelete}
                  disabled={deleting || uploading}
                  className="text-xs text-red-400 hover:text-red-600 hover:bg-red-50 h-8 px-2"
                  title="Eliminar contrato"
                >
                  {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                </Button>
              </>
            )}
          </div>
        </div>
      ) : canManage ? (
        /* ── Upload area (admin/agent only) ── */
        <div
          className="border-2 border-dashed border-gray-200 rounded-lg p-5 text-center hover:border-navy/40 hover:bg-navy/5 transition-colors cursor-pointer group"
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-7 w-7 animate-spin text-navy" />
              <p className="text-sm text-muted-foreground">Subiendo contrato...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-navy/10 flex items-center justify-center group-hover:bg-navy/20 transition-colors">
                <Upload className="h-5 w-5 text-navy" />
              </div>
              <div>
                <p className="text-sm font-semibold text-navy">Cargar Contrato</p>
                <p className="text-xs text-muted-foreground mt-0.5">PDF, DOC o DOCX — máx. 20 MB</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ── No contract, read-only ── */
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-gray-50 rounded-lg px-4 py-3 border border-dashed border-gray-200">
          <FileText className="h-4 w-4 opacity-40 shrink-0" />
          <span>Sin contrato adjunto aún</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-200">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.doc,.docx"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleUpload(file)
        }}
      />
    </div>
  )
}
