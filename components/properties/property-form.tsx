'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  PROPERTY_TYPES, OPERATION_TYPES, CURRENCIES,
  PROPERTY_CONDITIONS, PROPERTY_STYLES, CHILE_REGIONS, AMENITY_GROUPS,
} from '@/lib/constants'
import { createProperty, updateProperty } from '@/lib/actions/properties'
import { createClient } from '@/lib/supabase/client'
import { ComunaSelector } from '@/components/properties/comuna-selector'
import {
  Loader2, Upload, X, Globe, ChevronDown, ChevronUp,
  ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Maximize2,
} from 'lucide-react'
import type { Property, PropertyImage } from '@/types'

const MAX_IMAGES = 20

interface PropertyFormProps {
  property?: Property
}

// ─── Tiny helpers ──────────────────────────────────────────────────────────────

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  )
}

function Select({ name, defaultValue, children, required }: {
  name: string; defaultValue?: string; children: React.ReactNode; required?: boolean
}) {
  return (
    <select
      name={name}
      defaultValue={defaultValue || ''}
      required={required}
      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
    >
      {children}
    </select>
  )
}

function NumberInput({ name, defaultValue, min = 0, step, placeholder }: {
  name: string; defaultValue?: number | null; min?: number; step?: string; placeholder?: string
}) {
  return (
    <Input
      name={name}
      type="number"
      defaultValue={defaultValue ?? ''}
      min={min}
      step={step}
      placeholder={placeholder || '0'}
    />
  )
}

function SectionHeader({ title, icon }: { title: string; icon?: React.ReactNode }) {
  return (
    <CardHeader className="pb-3">
      <CardTitle className="text-base font-semibold flex items-center gap-2">
        {icon}
        {title}
      </CardTitle>
    </CardHeader>
  )
}

// ─── Image Lightbox ────────────────────────────────────────────────────────────

function ImageLightbox({
  images,
  startIndex,
  onClose,
}: {
  images: { src: string; alt: string }[]
  startIndex: number
  onClose: () => void
}) {
  const [idx, setIdx] = useState(startIndex)
  const [zoomed, setZoomed] = useState(false)

  const prev = () => { setZoomed(false); setIdx(i => (i - 1 + images.length) % images.length) }
  const next = () => { setZoomed(false); setIdx(i => (i + 1) % images.length) }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) { setZoomed(false); onClose() } }}
    >
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white/80 hover:text-white bg-black/50 rounded-full p-2 z-10"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Counter */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/70 text-sm bg-black/50 px-3 py-1 rounded-full">
        {idx + 1} / {images.length}
      </div>

      {/* Zoom toggle */}
      <button
        onClick={() => setZoomed(z => !z)}
        className="absolute bottom-4 right-4 text-white/80 hover:text-white bg-black/50 rounded-full p-2"
      >
        {zoomed ? <ZoomOut className="h-5 w-5" /> : <ZoomIn className="h-5 w-5" />}
      </button>

      {/* Prev */}
      {images.length > 1 && (
        <button
          onClick={prev}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white bg-black/50 rounded-full p-3"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}

      {/* Image */}
      <div
        className={`overflow-auto max-w-[90vw] max-h-[90vh] cursor-${zoomed ? 'zoom-out' : 'zoom-in'}`}
        onClick={() => setZoomed(z => !z)}
      >
        <img
          src={images[idx].src}
          alt={images[idx].alt}
          className="block transition-transform duration-200"
          style={{
            maxWidth: zoomed ? 'none' : '90vw',
            maxHeight: zoomed ? 'none' : '85vh',
            width: zoomed ? '150%' : 'auto',
          }}
        />
      </div>

      {/* Next */}
      {images.length > 1 && (
        <button
          onClick={next}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white bg-black/50 rounded-full p-3"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      )}

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 max-w-[80vw] overflow-x-auto pb-1">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => { setZoomed(false); setIdx(i) }}
              className={`flex-shrink-0 h-12 w-12 rounded overflow-hidden border-2 transition-all ${
                i === idx ? 'border-white scale-110' : 'border-white/30 opacity-60 hover:opacity-90'
              }`}
            >
              <img src={img.src} alt="" className="object-cover w-full h-full" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Amenities panel ───────────────────────────────────────────────────────────

function AmenitiesPanel({
  selected,
  onChange,
}: {
  selected: string[]
  onChange: (v: string[]) => void
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const toggle = (item: string) => {
    onChange(
      selected.includes(item) ? selected.filter(s => s !== item) : [...selected, item]
    )
  }

  return (
    <div className="space-y-3">
      {AMENITY_GROUPS.map(group => {
        const isOpen = expanded[group.group] !== false // default open
        return (
          <div key={group.group} className="border rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setExpanded(p => ({ ...p, [group.group]: !isOpen }))}
              className="w-full flex items-center justify-between px-4 py-2.5 bg-muted/40 hover:bg-muted/70 transition-colors text-sm font-medium"
            >
              <span>{group.group}</span>
              <div className="flex items-center gap-2">
                {group.items.filter(i => selected.includes(i)).length > 0 && (
                  <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                    {group.items.filter(i => selected.includes(i)).length}
                  </span>
                )}
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </button>
            {isOpen && (
              <div className="p-3 grid grid-cols-2 md:grid-cols-3 gap-2">
                {group.items.map(item => {
                  const checked = selected.includes(item)
                  return (
                    <label
                      key={item}
                      className={`flex items-center gap-2 px-3 py-2 rounded-md border cursor-pointer text-sm transition-colors ${
                        checked ? 'bg-primary/10 border-primary text-primary font-medium' : 'border-muted hover:bg-muted/50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(item)}
                        className="h-3.5 w-3.5 accent-primary"
                      />
                      {item}
                    </label>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Main form ─────────────────────────────────────────────────────────────────

export function PropertyForm({ property }: PropertyFormProps) {
  const router = useRouter()
  const isEditing = !!property

  // ── UI state ─────────────────────────────────────────────────────────────
  const [loading, setLoading]       = useState(false)
  const [progress, setProgress]     = useState('')
  const [error, setError]           = useState('')
  const [websiteVisible, setWebsiteVisible] = useState(property?.website_visible !== false)
  const [operation, setOperation]   = useState(property?.operation || '')

  // ── Amenities ─────────────────────────────────────────────────────────────
  const [amenities, setAmenities]   = useState<string[]>(property?.amenities || [])

  // ── Images — existing (from DB) ───────────────────────────────────────────
  const [existingImages, setExistingImages] = useState<PropertyImage[]>(property?.images || [])
  const [deletedImageIds, setDeletedImageIds] = useState<string[]>([])

  // ── Images — new (selected files) ────────────────────────────────────────
  const [newImages, setNewImages]   = useState<File[]>([])

  // ── Lightbox ──────────────────────────────────────────────────────────────
  const [lightbox, setLightbox]     = useState<{ open: boolean; index: number }>({ open: false, index: 0 })

  // All images for lightbox (existing + new previews)
  const allLightboxImages = [
    ...existingImages.map(img => ({ src: img.url, alt: '' })),
    ...newImages.map(f => ({ src: URL.createObjectURL(f), alt: f.name })),
  ]

  // ── Image handlers ────────────────────────────────────────────────────────

  async function compressImage(file: File): Promise<File> {
    if (!file.type.startsWith('image/')) return file
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let { width, height } = img
        const max = 1400
        if (width > max) { height = Math.round(height * max / width); width = max }
        canvas.width = width; canvas.height = height
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
        canvas.toBlob(blob => resolve(blob ? new File([blob], file.name, { type: 'image/jpeg' }) : file), 'image/jpeg', 0.75)
      }
      img.onerror = () => resolve(file)
      img.src = URL.createObjectURL(file)
    })
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    setNewImages(prev => {
      const combined = [...prev, ...files]
      const total = existingImages.length + combined.length
      if (total > MAX_IMAGES) {
        setError(`Máximo ${MAX_IMAGES} imágenes en total`)
        return combined.slice(0, MAX_IMAGES - existingImages.length)
      }
      setError('')
      return combined
    })
    e.target.value = ''
  }

  function removeExistingImage(img: PropertyImage) {
    setExistingImages(prev => prev.filter(i => i.id !== img.id))
    setDeletedImageIds(prev => [...prev, img.id])
  }

  function removeNewImage(index: number) {
    setNewImages(prev => prev.filter((_, i) => i !== index))
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)

    // Amenities as JSON
    formData.set('amenities_json', JSON.stringify(amenities))

    // Deleted image IDs
    formData.set('deleted_image_ids', JSON.stringify(deletedImageIds))

    // Upload new images
    if (newImages.length > 0) {
      setProgress('Comprimiendo imágenes...')
      const compressed = await Promise.all(newImages.map(compressImage))

      setProgress(`Subiendo ${compressed.length} imagen(es)...`)
      const supabase = createClient()
      const tempId = isEditing ? property!.id : crypto.randomUUID()

      const uploadResults = await Promise.all(
        compressed.map(async (file, i) => {
          const ext = file.name.split('.').pop() || 'jpg'
          const filePath = `${tempId}/${Date.now()}-${i}.${ext}`
          const { error } = await supabase.storage.from('property-images').upload(filePath, file)
          if (!error) {
            const { data } = supabase.storage.from('property-images').getPublicUrl(filePath)
            return data.publicUrl
          }
          return null
        })
      )

      const imageUrls = uploadResults.filter(Boolean) as string[]
      formData.set('image_urls', JSON.stringify(imageUrls))
      formData.set('temp_property_id', tempId)
    }

    setProgress('Guardando propiedad...')
    const result = isEditing
      ? await updateProperty(property!.id, formData)
      : await createProperty(formData)

    if (result?.error) {
      setError(result.error)
      setLoading(false)
      setProgress('')
    } else if (isEditing) {
      router.push('/dashboard/propiedades')
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const totalImages = existingImages.length + newImages.length

  return (
    <>
      {/* Lightbox */}
      {lightbox.open && allLightboxImages.length > 0 && (
        <ImageLightbox
          images={allLightboxImages}
          startIndex={lightbox.index}
          onClose={() => setLightbox({ open: false, index: 0 })}
        />
      )}

      <form onSubmit={handleSubmit}>
        {error && (
          <div className="mb-4 bg-destructive/10 text-destructive text-sm p-3 rounded-md border border-destructive/20">
            {error}
          </div>
        )}

        <div className="grid gap-5 md:grid-cols-3">

          {/* ── LEFT COLUMN (2/3) ───────────────────────────────────────── */}
          <div className="md:col-span-2 space-y-5">

            {/* ── 1. Información General ─────────────────────────────────── */}
            <Card>
              <SectionHeader title="Información General" />
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Título del Anuncio" required>
                    <Input name="title" defaultValue={property?.title} placeholder="Ej: Departamento 3D 2B en Las Condes" required />
                  </Field>
                  <Field label="Nombre Privado (interno)">
                    <Input name="private_name" defaultValue={property?.private_name || ''} placeholder="Ej: Edificio Jump - Piso 8" />
                  </Field>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Field label="Tipo *">
                    <Select name="type" defaultValue={property?.type} required>
                      <option value="">Seleccionar</option>
                      {PROPERTY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </Select>
                  </Field>
                  <Field label="Operación *">
                    <select
                      name="operation"
                      value={operation}
                      onChange={e => setOperation(e.target.value)}
                      required
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">Seleccionar</option>
                      {OPERATION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </Field>
                  <Field label="Condición">
                    <Select name="condition" defaultValue={property?.condition || ''}>
                      <option value="">Seleccionar</option>
                      {PROPERTY_CONDITIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </Select>
                  </Field>
                  <Field label="Código Interno">
                    <Input name="internal_code" defaultValue={property?.internal_code || ''} placeholder="FC-0011" />
                  </Field>
                </div>

                <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                  <Field label="Dormitorios">
                    <Select name="bedrooms" defaultValue={property?.bedrooms?.toString() || ''}>
                      <option value="">—</option>
                      {Array.from({ length: 11 }, (_, i) => <option key={i} value={i}>{i === 10 ? '10+' : i}</option>)}
                    </Select>
                  </Field>
                  <Field label="Baños">
                    <Select name="bathrooms" defaultValue={property?.bathrooms?.toString() || ''}>
                      <option value="">—</option>
                      {Array.from({ length: 11 }, (_, i) => <option key={i} value={i}>{i === 10 ? '10+' : i}</option>)}
                    </Select>
                  </Field>
                  <Field label="Medio Baño">
                    <Select name="half_bathrooms" defaultValue={property?.half_bathrooms?.toString() || ''}>
                      <option value="">—</option>
                      {Array.from({ length: 6 }, (_, i) => <option key={i} value={i}>{i}</option>)}
                    </Select>
                  </Field>
                  <Field label="Estacionam.">
                    <Select name="parking" defaultValue={property?.parking?.toString() || ''}>
                      <option value="">—</option>
                      {Array.from({ length: 11 }, (_, i) => <option key={i} value={i}>{i === 10 ? '10+' : i}</option>)}
                    </Select>
                  </Field>
                  <Field label="Bodega">
                    <Select name="storage" defaultValue={property?.storage?.toString() || ''}>
                      <option value="">—</option>
                      {Array.from({ length: 6 }, (_, i) => <option key={i} value={i}>{i}</option>)}
                    </Select>
                  </Field>
                  <Field label="Llaves">
                    <NumberInput name="keys_count" defaultValue={property?.keys_count} />
                  </Field>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Field label="Piso / Nivel">
                    <NumberInput name="floor_level" defaultValue={property?.floor_level} />
                  </Field>
                  <Field label="Total Pisos Edif.">
                    <NumberInput name="floor_count" defaultValue={property?.floor_count} />
                  </Field>
                  <Field label="Año Construcción">
                    <NumberInput name="year_built" defaultValue={property?.year_built} min={1800} placeholder="2020" />
                  </Field>
                  <Field label="Estilo">
                    <Select name="style" defaultValue={property?.style || ''}>
                      <option value="">Seleccionar</option>
                      {PROPERTY_STYLES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </Select>
                  </Field>
                </div>

                {/* Toggles */}
                <div className="flex flex-wrap gap-4 pt-1">
                  {[
                    { name: 'featured', label: 'Propiedad Destacada', defaultVal: property?.featured },
                    { name: 'exclusive', label: 'Exclusiva', defaultVal: property?.exclusive },
                    { name: 'furnished', label: 'Amueblada', defaultVal: property?.furnished },
                    { name: 'pets_allowed', label: 'Mascotas Permitidas', defaultVal: property?.pets_allowed },
                    { name: 'has_sign', label: 'Tiene Letrero', defaultVal: property?.has_sign },
                  ].map(({ name, label, defaultVal }) => (
                    <BoolToggle key={name} name={name} label={label} defaultValue={!!defaultVal} />
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* ── 2. Precio y Operación ──────────────────────────────────── */}
            <Card>
              <SectionHeader title="Precio y Operación" />
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <Field label="Precio *">
                    <Input name="price" type="number" defaultValue={property?.price} placeholder="0" required min={0} />
                  </Field>
                  <Field label="Moneda">
                    <Select name="currency" defaultValue={property?.currency || 'CLP'}>
                      {CURRENCIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </Select>
                  </Field>
                  <Field label="Gastos Comunes">
                    <NumberInput name="common_expenses" defaultValue={property?.common_expenses} placeholder="Mensual CLP" />
                  </Field>
                  {operation === 'venta' && (
                    <Field label="Contribuciones trimestrales">
                      <NumberInput name="contribuciones" defaultValue={property?.contribuciones} placeholder="Trimestral CLP" />
                    </Field>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* ── 3. Superficies ─────────────────────────────────────────── */}
            <Card>
              <SectionHeader title="Superficies" />
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <Field label="Superficie Total (m²)">
                    <NumberInput name="sqm" defaultValue={property?.sqm} step="0.1" placeholder="m²" />
                  </Field>
                  <Field label="Superficie Construida (m²)">
                    <NumberInput name="covered_sqm" defaultValue={property?.covered_sqm} step="0.1" placeholder="m²" />
                  </Field>
                  <Field label="Terraza / Logia (m²)">
                    <NumberInput name="terrace_sqm" defaultValue={property?.terrace_sqm} step="0.1" placeholder="m²" />
                  </Field>
                </div>
              </CardContent>
            </Card>

            {/* ── 4. Descripción ─────────────────────────────────────────── */}
            <Card>
              <SectionHeader title="Descripción" />
              <CardContent>
                <Textarea
                  name="description"
                  defaultValue={property?.description || ''}
                  placeholder="Describe detalladamente la propiedad: orientación, distribución, amenidades, entorno..."
                  rows={8}
                  className="resize-y"
                />
              </CardContent>
            </Card>

            {/* ── 5. Ubicación ───────────────────────────────────────────── */}
            <Card>
              <SectionHeader title="Ubicación" />
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Región">
                    <Select name="region" defaultValue={property?.region || ''}>
                      <option value="">Seleccionar Región</option>
                      {CHILE_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                    </Select>
                  </Field>
                  <Field label="Ciudad">
                    <Input name="city" defaultValue={property?.city || ''} placeholder="Santiago" />
                  </Field>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Sector / Comuna">
                    <ComunaSelector
                      name="sector"
                      defaultValue={property?.sector || ''}
                      placeholder="Buscar comuna (ej: Las Condes)"
                    />
                  </Field>
                  <Field label="Código Postal">
                    <Input name="zip_code" defaultValue={property?.zip_code || ''} placeholder="7550000" />
                  </Field>
                </div>
                <Field label="Dirección">
                  <Input name="address" defaultValue={property?.address || ''} placeholder="Av. Apoquindo 1234" />
                </Field>
                <Field label="Dirección 2 (oficina, torre, depto)">
                  <Input name="address2" defaultValue={property?.address2 || ''} placeholder="Torre A, Dpto 802" />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Latitud">
                    <Input name="lat" type="number" step="any" defaultValue={property?.lat ?? ''} placeholder="-33.4489" />
                  </Field>
                  <Field label="Longitud">
                    <Input name="lng" type="number" step="any" defaultValue={property?.lng ?? ''} placeholder="-70.6693" />
                  </Field>
                </div>
                <BoolToggle
                  name="show_exact_location"
                  label="Mostrar ubicación exacta en el sitio público"
                  defaultValue={property?.show_exact_location !== false}
                />
              </CardContent>
            </Card>

            {/* ── 6. Amenidades ──────────────────────────────────────────── */}
            <Card>
              <SectionHeader title="Amenidades" />
              <CardContent>
                <AmenitiesPanel selected={amenities} onChange={setAmenities} />
              </CardContent>
            </Card>

            {/* ── 7. Multimedia ──────────────────────────────────────────── */}
            <Card>
              <SectionHeader title="Multimedia" />
              <CardContent className="space-y-4">
                <Field label="Video YouTube (URL de embed o iFrame)">
                  <Input
                    name="video_url"
                    defaultValue={property?.video_url || ''}
                    placeholder="https://www.youtube.com/embed/..."
                  />
                </Field>
                <Field label="Tour Virtual (URL de iFrame 360°)">
                  <Input
                    name="virtual_tour_url"
                    defaultValue={property?.virtual_tour_url || ''}
                    placeholder="https://my.matterport.com/show/..."
                  />
                </Field>
                {/* Preview */}
                {property?.video_url && (
                  <div className="rounded-lg overflow-hidden aspect-video bg-muted">
                    <iframe src={property.video_url} className="w-full h-full" allowFullScreen />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ── 8. Imágenes ────────────────────────────────────────────── */}
            <Card>
              <SectionHeader title={`Imágenes (${totalImages}/${MAX_IMAGES})`} />
              <CardContent className="space-y-4">

                {/* Existing images */}
                {existingImages.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Imágenes actuales — haz click para ampliar</p>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                      {existingImages.map((img, i) => (
                        <div key={img.id} className="group relative aspect-square rounded-lg overflow-hidden bg-muted border">
                          <img
                            src={img.url}
                            alt=""
                            className="object-cover w-full h-full cursor-zoom-in"
                            onClick={() => setLightbox({ open: true, index: i })}
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
                          <button
                            type="button"
                            onClick={() => setLightbox({ open: true, index: i })}
                            className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 bg-black/50 text-white rounded p-1 transition-opacity"
                          >
                            <Maximize2 className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeExistingImage(img)}
                            className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 bg-destructive text-white rounded-full p-1 transition-opacity"
                          >
                            <X className="h-3 w-3" />
                          </button>
                          <div className="absolute bottom-1 left-1 opacity-0 group-hover:opacity-100 bg-black/50 text-white text-[10px] px-1 rounded transition-opacity">
                            #{i + 1}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* New images to upload */}
                {newImages.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Nuevas imágenes a subir</p>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                      {newImages.map((file, i) => (
                        <div key={i} className="group relative aspect-square rounded-lg overflow-hidden bg-muted border border-dashed border-primary/40">
                          <img
                            src={URL.createObjectURL(file)}
                            alt=""
                            className="object-cover w-full h-full cursor-zoom-in"
                            onClick={() => setLightbox({ open: true, index: existingImages.length + i })}
                          />
                          <button
                            type="button"
                            onClick={() => removeNewImage(i)}
                            className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 bg-destructive text-white rounded-full p-1 transition-opacity"
                          >
                            <X className="h-3 w-3" />
                          </button>
                          <div className="absolute bottom-1 left-1 bg-primary/80 text-white text-[9px] px-1 rounded">
                            NUEVA
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Upload zone */}
                {totalImages < MAX_IMAGES && (
                  <div
                    className="border-2 border-dashed rounded-lg p-6 text-center hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => document.getElementById('image-upload')?.click()}
                  >
                    <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm font-medium mb-1">Arrastra o haz click para subir imágenes</p>
                    <p className="text-xs text-muted-foreground">JPG, PNG, WebP • Máx. {MAX_IMAGES} imágenes • Se comprimen automáticamente</p>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageChange}
                      className="hidden"
                      id="image-upload"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

          </div>{/* end left column */}

          {/* ── RIGHT COLUMN (1/3) ──────────────────────────────────────── */}
          <div className="space-y-5">

            {/* ── Publicación Web ───────────────────────────────────────── */}
            <Card>
              <SectionHeader title="Publicación Web" icon={<Globe className="h-4 w-4 text-primary" />} />
              <CardContent className="space-y-3">
                <input type="hidden" name="website_visible" value={websiteVisible.toString()} />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Mostrar en el sitio público</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {websiteVisible ? 'Visible en tu sitio web.' : 'Oculta del sitio web.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setWebsiteVisible(v => !v)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                      websiteVisible ? 'bg-primary' : 'bg-gray-300'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${
                      websiteVisible ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* ── Estado ────────────────────────────────────────────────── */}
            <Card>
              <SectionHeader title="Estado de la Propiedad" />
              <CardContent>
                <Field label="Estado">
                  <Select name="status" defaultValue={(property as any)?.status || 'available'}>
                    <option value="available">Disponible</option>
                    <option value="reserved">Reservada</option>
                    <option value="rented">Arrendada</option>
                    <option value="sold">Vendida</option>
                    <option value="unavailable">No disponible</option>
                  </Select>
                </Field>
              </CardContent>
            </Card>

            {/* ── Notas Privadas ────────────────────────────────────────── */}
            <Card>
              <SectionHeader title="Notas Privadas" />
              <CardContent className="space-y-3">
                <Textarea
                  name="private_notes"
                  defaultValue={property?.private_notes || ''}
                  placeholder="Acuerdos con propietario, acceso a la propiedad, info interna..."
                  rows={4}
                  className="resize-y text-sm"
                />
                <Field label="Correo de notificación">
                  <Input
                    name="notify_email"
                    type="email"
                    defaultValue={property?.notify_email || ''}
                    placeholder="notificar@tuinmobiliaria.cl"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Recibirá una copia cuando llegue un nuevo cliente.
                  </p>
                </Field>
              </CardContent>
            </Card>

          </div>{/* end right column */}
        </div>

        {/* ── Actions ──────────────────────────────────────────────────────── */}
        <div className="flex justify-end gap-3 mt-6 sticky bottom-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={loading}
            className="bg-background shadow-sm"
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={loading} className="shadow-sm min-w-[160px]">
            {loading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{progress || 'Guardando...'}</>
            ) : (
              isEditing ? 'Guardar Cambios' : 'Publicar Propiedad'
            )}
          </Button>
        </div>
      </form>
    </>
  )
}

// ─── Boolean toggle helper (controlled via hidden input) ───────────────────────

function BoolToggle({
  name,
  label,
  defaultValue,
}: {
  name: string
  label: string
  defaultValue: boolean
}) {
  const [val, setVal] = useState(defaultValue)
  return (
    <div className="flex items-center gap-3">
      <input type="hidden" name={name} value={val.toString()} />
      <button
        type="button"
        onClick={() => setVal(v => !v)}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0 ${
          val ? 'bg-primary' : 'bg-gray-300'
        }`}
      >
        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm ${
          val ? 'translate-x-4.5' : 'translate-x-0.5'
        }`} />
      </button>
      <span className="text-sm">{label}</span>
    </div>
  )
}
