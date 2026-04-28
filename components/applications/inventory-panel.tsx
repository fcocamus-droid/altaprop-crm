'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  ClipboardList, CheckCircle2, XCircle, Minus, Camera, Loader2,
  Save, AlertCircle, ChevronDown, ChevronUp, PenLine, Trash2, X
} from 'lucide-react'
import { Button } from '@/components/ui/button'

// ── Types ────────────────────────────────────────────────────────────────────

interface InventoryItem {
  name: string
  state: 'ok' | 'bad' | 'na' | null
  observation: string
  photos: string[]
}

interface Inventory {
  id?: string
  estado_general: InventoryItem[]
  instalaciones: InventoryItem[]
  equipamiento: InventoryItem[]
  medidor_electricidad: string
  medidor_agua: string
  medidor_gas: string
  llaves_cantidad: number | ''
  llaves_detalle: string
  observaciones: string
  firma_arrendador: string | null
  firma_arrendatario: string | null
  firma_altaprop: string | null
  status: 'draft' | 'completed'
}

const DEFAULT_INVENTORY: Inventory = {
  estado_general: [
    { name: 'Muros', state: null, observation: '', photos: [] },
    { name: 'Pisos', state: null, observation: '', photos: [] },
    { name: 'Techos', state: null, observation: '', photos: [] },
    { name: 'Puertas y ventanas', state: null, observation: '', photos: [] },
  ],
  instalaciones: [
    { name: 'Instalación eléctrica', state: null, observation: '', photos: [] },
    { name: 'Instalación de gas', state: null, observation: '', photos: [] },
    { name: 'Agua y alcantarillado', state: null, observation: '', photos: [] },
  ],
  equipamiento: [
    { name: 'Cocina / Encimera', state: null, observation: '', photos: [] },
    { name: 'Horno', state: null, observation: '', photos: [] },
    { name: 'Campana', state: null, observation: '', photos: [] },
    { name: 'Calefacción', state: null, observation: '', photos: [] },
    { name: 'Otros', state: null, observation: '', photos: [] },
  ],
  medidor_electricidad: '',
  medidor_agua: '',
  medidor_gas: '',
  llaves_cantidad: '',
  llaves_detalle: '',
  observaciones: '',
  firma_arrendador: null,
  firma_arrendatario: null,
  firma_altaprop: null,
  status: 'draft',
}

// ── Signature Pad ─────────────────────────────────────────────────────────────

function SignaturePad({
  value, onChange, label, readOnly,
}: {
  value: string | null
  onChange: (val: string) => void
  label: string
  readOnly?: boolean
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const [hasSig, setHasSig] = useState(!!value)

  useEffect(() => {
    if (value && canvasRef.current) {
      const img = new Image()
      img.onload = () => {
        const ctx = canvasRef.current?.getContext('2d')
        if (ctx && canvasRef.current) {
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
          ctx.drawImage(img, 0, 0, canvasRef.current.width, canvasRef.current.height)
        }
      }
      img.src = value
    }
  }, [value])

  function getXY(e: React.MouseEvent | React.TouchEvent) {
    const c = canvasRef.current!
    const r = c.getBoundingClientRect()
    const sx = c.width / r.width
    const sy = c.height / r.height
    if ('touches' in e) {
      return { x: (e.touches[0].clientX - r.left) * sx, y: (e.touches[0].clientY - r.top) * sy }
    }
    return { x: ((e as React.MouseEvent).clientX - r.left) * sx, y: ((e as React.MouseEvent).clientY - r.top) * sy }
  }

  function start(e: React.MouseEvent | React.TouchEvent) {
    if (readOnly) return
    e.preventDefault()
    drawing.current = true
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const { x, y } = getXY(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  function move(e: React.MouseEvent | React.TouchEvent) {
    if (!drawing.current || readOnly) return
    e.preventDefault()
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const { x, y } = getXY(e)
    ctx.lineTo(x, y)
    ctx.strokeStyle = '#1a2332'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()
  }

  function end() {
    if (!drawing.current) return
    drawing.current = false
    setHasSig(true)
    const url = canvasRef.current?.toDataURL('image/png')
    if (url) onChange(url)
  }

  function clear() {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx || !canvasRef.current) return
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
    setHasSig(false)
    onChange('')
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-navy flex items-center gap-1.5">
          <PenLine className="h-4 w-4" />{label}
        </p>
        {!readOnly && hasSig && (
          <button type="button" onClick={clear} className="text-xs text-red-500 hover:underline flex items-center gap-1">
            <X className="h-3 w-3" />Limpiar
          </button>
        )}
      </div>
      <div className={`rounded-xl border-2 overflow-hidden ${readOnly ? 'border-gray-200 bg-gray-50' : 'border-navy/20 bg-white'}`}>
        <canvas
          ref={canvasRef}
          width={560}
          height={130}
          className="w-full touch-none"
          style={{ cursor: readOnly ? 'default' : 'crosshair' }}
          onMouseDown={start}
          onMouseMove={move}
          onMouseUp={end}
          onMouseLeave={end}
          onTouchStart={start}
          onTouchMove={move}
          onTouchEnd={end}
        />
      </div>
      {!hasSig && !readOnly && (
        <p className="text-xs text-center text-muted-foreground">Dibuja tu firma aquí con el mouse o dedo</p>
      )}
      {readOnly && !hasSig && (
        <p className="text-xs text-center text-muted-foreground italic">Pendiente de firma</p>
      )}
    </div>
  )
}

// ── Item Row ──────────────────────────────────────────────────────────────────

function ItemRow({
  item, onChange, canEdit, applicationId, sectionKey, itemIndex,
}: {
  item: InventoryItem
  onChange: (updated: InventoryItem) => void
  canEdit: boolean
  applicationId: string
  sectionKey: string
  itemIndex: number
}) {
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop()
      const path = `inventory/${applicationId}/${sectionKey}/${itemIndex}-${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('property-images').upload(path, file, { upsert: false })
      if (!error) {
        const { data } = supabase.storage.from('property-images').getPublicUrl(path)
        onChange({ ...item, photos: [...item.photos, data.publicUrl] })
      }
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function removePhoto(url: string) {
    onChange({ ...item, photos: item.photos.filter(p => p !== url) })
  }

  const stateConfig = {
    ok:  { label: 'Bueno',  color: 'bg-green-100 text-green-800 border-green-300',  icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
    bad: { label: 'Malo',   color: 'bg-red-100 text-red-800 border-red-300',        icon: <XCircle className="h-3.5 w-3.5" /> },
    na:  { label: 'N/A',    color: 'bg-gray-100 text-gray-600 border-gray-300',     icon: <Minus className="h-3.5 w-3.5" /> },
  } as const

  return (
    <div className="py-3 border-b border-gray-100 last:border-0">
      <div className="flex items-start gap-3">
        {/* Item name */}
        <div className="w-40 shrink-0 pt-1">
          <p className="text-sm font-medium text-gray-700">{item.name}</p>
        </div>

        {/* State buttons */}
        <div className="flex gap-1.5 shrink-0">
          {(['ok', 'bad', 'na'] as const).map(s => (
            <button
              key={s}
              type="button"
              disabled={!canEdit}
              onClick={() => onChange({ ...item, state: item.state === s ? null : s })}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full border transition-all ${
                item.state === s
                  ? stateConfig[s].color
                  : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
              } ${!canEdit ? 'cursor-default' : 'cursor-pointer'}`}
            >
              {stateConfig[s].icon}
              {stateConfig[s].label}
            </button>
          ))}
        </div>

        {/* Observation */}
        <div className="flex-1 min-w-0">
          {canEdit ? (
            <input
              type="text"
              value={item.observation}
              onChange={e => onChange({ ...item, observation: e.target.value })}
              placeholder="Observación..."
              className="w-full text-sm px-2.5 py-1 border rounded-lg focus:outline-none focus:ring-1 focus:ring-navy/30"
            />
          ) : (
            item.observation
              ? <p className="text-sm text-gray-600 italic">&ldquo;{item.observation}&rdquo;</p>
              : <p className="text-sm text-muted-foreground">—</p>
          )}
        </div>

        {/* Photo upload */}
        {canEdit && (
          <div className="shrink-0">
            <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="p-1.5 text-muted-foreground hover:text-navy border rounded-lg hover:border-navy/30 transition-colors"
              title="Agregar foto"
            >
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
            </button>
          </div>
        )}
      </div>

      {/* Photos */}
      {item.photos.length > 0 && (
        <div className="mt-2 ml-40 flex gap-2 flex-wrap">
          {item.photos.map((url, i) => (
            <div key={i} className="relative group">
              <a href={url} target="_blank" rel="noopener noreferrer">
                <img src={url} alt="" className="w-16 h-16 object-cover rounded-lg border" />
              </a>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => removePhoto(url)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Section Block ─────────────────────────────────────────────────────────────

function SectionBlock({
  title, items, onChange, canEdit, applicationId, sectionKey,
}: {
  title: string
  items: InventoryItem[]
  onChange: (items: InventoryItem[]) => void
  canEdit: boolean
  applicationId: string
  sectionKey: string
}) {
  const allOk = items.every(i => i.state === 'ok')
  const anyBad = items.some(i => i.state === 'bad')
  const anyNull = items.some(i => i.state === null)

  return (
    <div className="rounded-xl border bg-white overflow-hidden">
      <div className={`px-4 py-3 flex items-center justify-between ${
        anyBad ? 'bg-red-50 border-b border-red-100' :
        anyNull ? 'bg-gray-50 border-b border-gray-100' :
        'bg-green-50 border-b border-green-100'
      }`}>
        <p className="font-semibold text-sm text-navy">{title}</p>
        <div className="flex items-center gap-1.5">
          {items.map((item, i) => (
            <div
              key={i}
              title={item.name}
              className={`w-2.5 h-2.5 rounded-full ${
                item.state === 'ok'  ? 'bg-green-500' :
                item.state === 'bad' ? 'bg-red-500' :
                item.state === 'na'  ? 'bg-gray-400' :
                'bg-gray-200'
              }`}
            />
          ))}
        </div>
      </div>
      <div className="px-4 divide-y divide-gray-50">
        {items.map((item, i) => (
          <ItemRow
            key={i}
            item={item}
            onChange={updated => {
              const next = [...items]
              next[i] = updated
              onChange(next)
            }}
            canEdit={canEdit}
            applicationId={applicationId}
            sectionKey={sectionKey}
            itemIndex={i}
          />
        ))}
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export function InventoryPanel({
  applicationId,
  userRole,
  isApplicant,
}: {
  applicationId: string
  userRole?: string
  isApplicant: boolean
}) {
  const [inventory, setInventory] = useState<Inventory | null>(null)
  const [appInfo, setAppInfo] = useState<{ property_title?: string; property_address?: string; applicant_name?: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [creating, setCreating] = useState(false)
  const [open, setOpen] = useState(false)

  const canEdit = !isApplicant && ['SUPERADMINBOSS', 'SUPERADMIN', 'AGENTE'].includes(userRole || '')
  const canSignArrendador = !isApplicant && userRole === 'PROPIETARIO'
  const canSignArrendatario = isApplicant
  const canSignAltaprop = canEdit

  useEffect(() => {
    fetch(`/api/applications/${applicationId}/inventory`)
      .then(r => r.json())
      .then(data => {
        if (data.inventory) {
          setInventory({
            ...DEFAULT_INVENTORY,
            ...data.inventory,
            llaves_cantidad: data.inventory.llaves_cantidad ?? '',
          })
        }
        setAppInfo(data.application || null)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [applicationId])

  function updateSection(section: keyof Pick<Inventory, 'estado_general' | 'instalaciones' | 'equipamiento'>, items: InventoryItem[]) {
    setInventory(prev => prev ? { ...prev, [section]: items } : prev)
  }

  async function handleSave(status?: 'draft' | 'completed') {
    if (!inventory) return
    setSaving(true)
    setSaveError('')
    setSaveSuccess(false)

    const payload = { ...inventory }
    if (status) payload.status = status

    try {
      const res = await fetch(`/api/applications/${applicationId}/inventory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (data.error) {
        setSaveError(data.error)
      } else {
        setSaveSuccess(true)
        if (status) setInventory(prev => prev ? { ...prev, status } : prev)
        setTimeout(() => setSaveSuccess(false), 3000)
      }
    } catch {
      setSaveError('Error de conexión')
    }
    setSaving(false)
  }

  async function handleSignature(field: 'firma_arrendador' | 'firma_arrendatario' | 'firma_altaprop', value: string) {
    setInventory(prev => prev ? { ...prev, [field]: value || null } : prev)
    // Auto-save signature immediately
    try {
      await fetch(`/api/applications/${applicationId}/inventory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value || null }),
      })
    } catch {}
  }

  async function handleCreate() {
    setCreating(true)
    setInventory({ ...DEFAULT_INVENTORY })
    try {
      await fetch(`/api/applications/${applicationId}/inventory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...DEFAULT_INVENTORY }),
      })
      setOpen(true)
    } catch {}
    setCreating(false)
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
        <Loader2 className="h-4 w-4 animate-spin" />Cargando inventario...
      </div>
    )
  }

  const statusColors = {
    draft: 'bg-amber-100 text-amber-800 border-amber-200',
    completed: 'bg-green-100 text-green-800 border-green-200',
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div
        className="flex items-center justify-between cursor-pointer select-none"
        onClick={() => inventory && setOpen(o => !o)}
      >
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-navy shrink-0" />
          <p className="text-sm font-semibold text-navy">Inventario de Entrega</p>
          {inventory && (
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusColors[inventory.status]}`}>
              {inventory.status === 'completed' ? '✓ Completado' : '✏️ Borrador'}
            </span>
          )}
        </div>
        {inventory && (
          <div className="flex items-center gap-2">
            {canEdit && !open && (
              <span className="text-xs text-muted-foreground">Click para editar</span>
            )}
            {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </div>
        )}
      </div>

      {/* No inventory yet */}
      {!inventory && (
        <div className="rounded-xl border border-dashed border-muted-foreground/30 bg-muted/10 p-4 text-center space-y-2">
          <p className="text-sm text-muted-foreground">No se ha creado el inventario de entrega aún.</p>
          {canEdit && (
            <Button
              size="sm"
              variant="outline"
              disabled={creating}
              onClick={handleCreate}
              className="gap-2"
            >
              {creating
                ? <><Loader2 className="h-4 w-4 animate-spin" />Creando...</>
                : <><ClipboardList className="h-4 w-4" />Crear Inventario</>
              }
            </Button>
          )}
        </div>
      )}

      {/* Inventory form */}
      {inventory && open && (
        <div className="space-y-4 pt-1">
          {/* Property info header */}
          {appInfo && (
            <div className="bg-navy/5 rounded-xl p-3 text-sm space-y-0.5">
              <p className="font-semibold text-navy">{appInfo.property_title || 'Propiedad'}</p>
              {appInfo.property_address && <p className="text-muted-foreground text-xs">{appInfo.property_address}</p>}
              {appInfo.applicant_name && <p className="text-xs text-muted-foreground">Arrendatario: <strong>{appInfo.applicant_name}</strong></p>}
            </div>
          )}

          {/* Checklist sections */}
          <SectionBlock
            title="1. Estado General del Inmueble"
            items={inventory.estado_general}
            onChange={items => updateSection('estado_general', items)}
            canEdit={canEdit}
            applicationId={applicationId}
            sectionKey="estado_general"
          />
          <SectionBlock
            title="2. Instalaciones"
            items={inventory.instalaciones}
            onChange={items => updateSection('instalaciones', items)}
            canEdit={canEdit}
            applicationId={applicationId}
            sectionKey="instalaciones"
          />
          <SectionBlock
            title="3. Artefactos y Equipamiento"
            items={inventory.equipamiento}
            onChange={items => updateSection('equipamiento', items)}
            canEdit={canEdit}
            applicationId={applicationId}
            sectionKey="equipamiento"
          />

          {/* Medidores */}
          <div className="rounded-xl border bg-white p-4 space-y-3">
            <p className="font-semibold text-sm text-navy">4. Lectura de Medidores</p>
            <div className="grid grid-cols-3 gap-3">
              {([
                { key: 'medidor_electricidad', label: 'Electricidad' },
                { key: 'medidor_agua', label: 'Agua' },
                { key: 'medidor_gas', label: 'Gas' },
              ] as const).map(({ key, label }) => (
                <div key={key} className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">{label}</label>
                  <input
                    type="text"
                    value={inventory[key]}
                    onChange={e => setInventory(prev => prev ? { ...prev, [key]: e.target.value } : prev)}
                    disabled={!canEdit}
                    placeholder="Lectura..."
                    className="w-full text-sm px-3 py-1.5 border rounded-lg focus:outline-none focus:ring-1 focus:ring-navy/30 disabled:bg-gray-50 disabled:text-muted-foreground"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Llaves */}
          <div className="rounded-xl border bg-white p-4 space-y-3">
            <p className="font-semibold text-sm text-navy">5. Llaves Entregadas</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Cantidad</label>
                <input
                  type="number"
                  min="0"
                  value={inventory.llaves_cantidad}
                  onChange={e => setInventory(prev => prev ? { ...prev, llaves_cantidad: e.target.value === '' ? '' : Number(e.target.value) } : prev)}
                  disabled={!canEdit}
                  placeholder="0"
                  className="w-full text-sm px-3 py-1.5 border rounded-lg focus:outline-none focus:ring-1 focus:ring-navy/30 disabled:bg-gray-50"
                />
              </div>
              <div className="space-y-1 col-span-2">
                <label className="text-xs font-medium text-muted-foreground">Detalle</label>
                <input
                  type="text"
                  value={inventory.llaves_detalle}
                  onChange={e => setInventory(prev => prev ? { ...prev, llaves_detalle: e.target.value } : prev)}
                  disabled={!canEdit}
                  placeholder="Ej: 2 llaves puerta principal, 1 llave buzón..."
                  className="w-full text-sm px-3 py-1.5 border rounded-lg focus:outline-none focus:ring-1 focus:ring-navy/30 disabled:bg-gray-50"
                />
              </div>
            </div>
          </div>

          {/* Observaciones */}
          <div className="rounded-xl border bg-white p-4 space-y-3">
            <p className="font-semibold text-sm text-navy">6. Observaciones Generales</p>
            <textarea
              value={inventory.observaciones}
              onChange={e => setInventory(prev => prev ? { ...prev, observaciones: e.target.value } : prev)}
              disabled={!canEdit}
              placeholder="Ingresa observaciones generales del estado de la propiedad al momento de la entrega..."
              rows={4}
              className="w-full text-sm px-3 py-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-navy/30 disabled:bg-gray-50 resize-none"
            />
          </div>

          {/* Firmas */}
          <div className="rounded-xl border bg-white p-4 space-y-5">
            <p className="font-semibold text-sm text-navy">7. Firmas</p>
            <div className="grid grid-cols-1 gap-6">
              <SignaturePad
                value={inventory.firma_arrendador}
                onChange={val => handleSignature('firma_arrendador', val)}
                label="Firma Arrendador / Propietario"
                readOnly={!canSignArrendador && !canEdit}
              />
              <SignaturePad
                value={inventory.firma_arrendatario}
                onChange={val => handleSignature('firma_arrendatario', val)}
                label="Firma Arrendatario"
                readOnly={!canSignArrendatario && !canEdit}
              />
              <SignaturePad
                value={inventory.firma_altaprop}
                onChange={val => handleSignature('firma_altaprop', val)}
                label="Firma AltaProp"
                readOnly={!canSignAltaprop}
              />
            </div>
          </div>

          {/* Save controls */}
          {(canEdit || canSignArrendador || canSignArrendatario) && (
            <div className="flex items-center gap-3 pt-1">
              {canEdit && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={saving}
                    onClick={() => handleSave('draft')}
                    className="gap-2"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Guardar borrador
                  </Button>
                  {inventory.status !== 'completed' && (
                    <Button
                      size="sm"
                      disabled={saving}
                      onClick={() => handleSave('completed')}
                      className="gap-2 bg-navy text-white hover:bg-navy/90"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Marcar como completado
                    </Button>
                  )}
                </>
              )}
              {(canSignArrendador || canSignArrendatario) && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={saving}
                  onClick={() => handleSave()}
                  className="gap-2"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <PenLine className="h-4 w-4" />}
                  Guardar firma
                </Button>
              )}
              {saveSuccess && (
                <span className="text-xs text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />Guardado
                </span>
              )}
              {saveError && (
                <span className="text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5" />{saveError}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
