'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { importProperty } from '@/lib/actions/properties'

interface ScrapedData {
  title: string
  price: number
  currency: string
  operation: string
  type: string
  bedrooms: number
  bathrooms: number
  half_bathrooms?: number
  sqm: number
  covered_sqm?: number | null
  terrace_sqm?: number | null
  address: string
  city: string
  sector: string
  description: string
  images: string[]
  common_expenses?: number
  pets_allowed?: boolean
  parking?: number
  storage?: number
  floor_level?: number | null
  floor_count?: number | null
  furnished?: boolean
  year_built?: number | null
  condition?: string
  amenities?: string[]
  virtual_tour_url?: string
  video_url?: string
  internal_code?: string
}

export function ImportProperty() {
  const [url, setUrl] = useState('')
  const [step, setStep] = useState<'input' | 'loading' | 'preview' | 'publishing' | 'done'>('input')
  const [data, setData] = useState<ScrapedData | null>(null)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleExtract = async () => {
    if (!url.startsWith('http')) {
      setError('Ingresa una URL valida (debe comenzar con https://)')
      return
    }

    setError('')
    setStep('loading')

    try {
      // Try server-side API first
      const res = await fetch('/api/scrape-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })

      const result = await res.json()

      if (result.error) {
        setError(result.error)
        setStep('input')
        return
      }

      if (result.fallback) {
        // API blocked - extract from URL pattern
        const extracted = extractFromUrl(url)
        setData(extracted)
        setStep('preview')
        return
      }

      setData(result)
      setStep('preview')
    } catch (e: any) {
      // Fallback: extract basic info from URL
      const extracted = extractFromUrl(url)
      setData(extracted)
      setStep('preview')
    }
  }

  const handlePublish = async () => {
    if (!data) return
    setStep('publishing')
    setError('')

    const result = await importProperty({
      title: data.title,
      description: data.description,
      type: data.type,
      operation: data.operation,
      price: data.price,
      currency: data.currency,
      address: data.address,
      city: data.city,
      sector: data.sector,
      bedrooms: data.bedrooms,
      bathrooms: data.bathrooms,
      half_bathrooms: data.half_bathrooms,
      sqm: data.sqm,
      covered_sqm: data.covered_sqm,
      terrace_sqm: data.terrace_sqm,
      images: data.images,
      common_expenses: data.common_expenses,
      pets_allowed: data.pets_allowed,
      parking: data.parking,
      storage: data.storage,
      floor_level: data.floor_level,
      floor_count: data.floor_count,
      furnished: data.furnished,
      year_built: data.year_built,
      condition: data.condition,
      amenities: data.amenities,
      virtual_tour_url: data.virtual_tour_url,
      video_url: data.video_url,
      internal_code: data.internal_code,
    })

    if (result.error) {
      setError(result.error)
      setStep('preview')
      return
    }

    setStep('done')
    setTimeout(() => {
      if (result.propertyId) {
        router.push(`/dashboard/propiedades/${result.propertyId}`)
      } else {
        router.push('/dashboard/propiedades')
      }
    }, 800)
  }

  const handleEditField = (field: keyof ScrapedData, value: any) => {
    if (!data) return
    setData({ ...data, [field]: value })
  }

  return (
    <div className="space-y-4">
      {/* Step 1: URL Input */}
      {step === 'input' && (
        <Card className="border-2 border-dashed border-gold/40 hover:border-gold/60 transition-colors">
          <CardContent className="p-6">
            <div className="text-center mb-4">
              <div className="w-12 h-12 bg-gold/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gold">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M2 12h20" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-navy">Importar Propiedad desde tu Sitio Web</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Pega la URL de una propiedad de tu sitio y se importara automaticamente
              </p>
            </div>

            <div className="flex gap-2">
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://tusitio.cl/propiedad/departamento-santiago..."
                className="flex-1"
              />
              <Button onClick={handleExtract} className="bg-gold hover:bg-gold/90 text-navy font-semibold whitespace-nowrap">
                Importar
              </Button>
            </div>

            {error && (
              <p className="text-sm text-red-500 mt-2">{error}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Loading */}
      {step === 'loading' && (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="animate-spin w-10 h-10 border-4 border-gold/30 border-t-gold rounded-full mx-auto mb-4" />
            <p className="text-navy font-medium">Extrayendo datos del sitio...</p>
            <p className="text-sm text-muted-foreground mt-1">Esto puede tomar unos segundos</p>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Preview & Edit */}
      {step === 'preview' && data && (
        <Card className="border-2 border-gold/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-navy">Vista Previa de Importación</h3>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => { setStep('input'); setData(null) }}>
                  Cancelar
                </Button>
                <Button onClick={handlePublish} className="bg-green-600 hover:bg-green-700 text-white" size="sm">
                  Importar y Editar
                </Button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-md mb-4">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 space-y-1">
                <Label className="text-sm">Título</Label>
                <Input value={data.title} onChange={(e) => handleEditField('title', e.target.value)} />
              </div>

              <div className="space-y-1">
                <Label className="text-sm">Operación</Label>
                <select
                  value={data.operation}
                  onChange={(e) => handleEditField('operation', e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-sm"
                >
                  <option value="arriendo">Arriendo</option>
                  <option value="arriendo_temporal">Arriendo Temporal</option>
                  <option value="venta">Venta</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-sm">Tipo</Label>
                <select
                  value={data.type}
                  onChange={(e) => handleEditField('type', e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-sm"
                >
                  <option value="departamento">Departamento</option>
                  <option value="casa">Casa</option>
                  <option value="casa_condominio">Casa en Condominio</option>
                  <option value="villa">Villa</option>
                  <option value="quinta">Quinta</option>
                  <option value="monoambiente">Monoambiente</option>
                  <option value="terreno">Terreno</option>
                  <option value="terreno_comercial">Terreno Comercial</option>
                  <option value="oficina">Oficina</option>
                  <option value="local">Local Comercial</option>
                  <option value="bodega">Bodega</option>
                  <option value="edificio">Edificio</option>
                  <option value="hotel">Hotel</option>
                  <option value="nave_industrial">Nave Industrial</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-sm">Precio</Label>
                <Input type="number" value={data.price} onChange={(e) => handleEditField('price', Number(e.target.value))} />
              </div>

              <div className="space-y-1">
                <Label className="text-sm">Moneda</Label>
                <select
                  value={data.currency}
                  onChange={(e) => handleEditField('currency', e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-sm"
                >
                  <option value="CLP">CLP</option>
                  <option value="UF">UF</option>
                  <option value="USD">USD</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-sm">Dormitorios</Label>
                <Input type="number" value={data.bedrooms} onChange={(e) => handleEditField('bedrooms', Number(e.target.value))} />
              </div>

              <div className="space-y-1">
                <Label className="text-sm">Baños</Label>
                <Input type="number" value={data.bathrooms} onChange={(e) => handleEditField('bathrooms', Number(e.target.value))} />
              </div>

              <div className="space-y-1">
                <Label className="text-sm">Superficie Total (m²)</Label>
                <Input type="number" value={data.sqm} onChange={(e) => handleEditField('sqm', Number(e.target.value))} />
              </div>

              <div className="space-y-1">
                <Label className="text-sm">Superficie Útil/Cubierta (m²)</Label>
                <Input type="number" value={data.covered_sqm ?? ''} onChange={(e) => handleEditField('covered_sqm', e.target.value ? Number(e.target.value) : null)} placeholder="Opcional" />
              </div>

              <div className="space-y-1">
                <Label className="text-sm">Terraza (m²)</Label>
                <Input type="number" value={data.terrace_sqm ?? ''} onChange={(e) => handleEditField('terrace_sqm', e.target.value ? Number(e.target.value) : null)} placeholder="Opcional" />
              </div>

              <div className="space-y-1">
                <Label className="text-sm">Baños de Servicio</Label>
                <Input type="number" value={data.half_bathrooms ?? 0} onChange={(e) => handleEditField('half_bathrooms', Number(e.target.value))} />
              </div>

              <div className="space-y-1">
                <Label className="text-sm">Ciudad</Label>
                <Input value={data.city} onChange={(e) => handleEditField('city', e.target.value)} />
              </div>

              <div className="space-y-1">
                <Label className="text-sm">Sector</Label>
                <Input value={data.sector} onChange={(e) => handleEditField('sector', e.target.value)} />
              </div>

              <div className="space-y-1">
                <Label className="text-sm">Dirección</Label>
                <Input value={data.address} onChange={(e) => handleEditField('address', e.target.value)} />
              </div>

              <div className="space-y-1">
                <Label className="text-sm">Gastos Comunes ($)</Label>
                <Input type="number" value={data.common_expenses || 0} onChange={(e) => handleEditField('common_expenses', Number(e.target.value))} />
              </div>

              <div className="space-y-1">
                <Label className="text-sm">Estacionamientos</Label>
                <Input type="number" value={data.parking || 0} onChange={(e) => handleEditField('parking', Number(e.target.value))} />
              </div>

              <div className="space-y-1">
                <Label className="text-sm">Bodegas</Label>
                <Input type="number" value={data.storage || 0} onChange={(e) => handleEditField('storage', Number(e.target.value))} />
              </div>

              <div className="space-y-1">
                <Label className="text-sm">Piso</Label>
                <Input type="number" value={data.floor_level ?? ''} onChange={(e) => handleEditField('floor_level', e.target.value ? Number(e.target.value) : null)} placeholder="Opcional" />
              </div>

              <div className="space-y-1">
                <Label className="text-sm">N° Pisos del Edificio</Label>
                <Input type="number" value={data.floor_count ?? ''} onChange={(e) => handleEditField('floor_count', e.target.value ? Number(e.target.value) : null)} placeholder="Opcional" />
              </div>

              <div className="space-y-1">
                <Label className="text-sm">Año de Construcción</Label>
                <Input type="number" value={data.year_built ?? ''} onChange={(e) => handleEditField('year_built', e.target.value ? Number(e.target.value) : null)} placeholder="Ej: 2010" />
              </div>

              <div className="space-y-1">
                <Label className="text-sm">Estado</Label>
                <Input value={data.condition ?? ''} onChange={(e) => handleEditField('condition', e.target.value)} placeholder="Ej: Nuevo, Usado, En construcción" />
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={data.pets_allowed || false} onChange={(e) => handleEditField('pets_allowed', e.target.checked)} className="rounded" />
                  Acepta mascotas
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={data.furnished || false} onChange={(e) => handleEditField('furnished', e.target.checked)} className="rounded" />
                  Amoblado
                </label>
              </div>

              <div className="md:col-span-2 space-y-1">
                <Label className="text-sm">Descripción</Label>
                <textarea
                  value={data.description}
                  onChange={(e) => handleEditField('description', e.target.value)}
                  rows={8}
                  className="w-full border rounded-md px-3 py-2 text-sm resize-y min-h-[120px]"
                />
              </div>

              {/* Amenidades */}
              {data.amenities && data.amenities.length > 0 && (
                <div className="md:col-span-2 space-y-2">
                  <Label className="text-sm font-medium">Amenidades ({data.amenities.length})</Label>
                  <div className="flex flex-wrap gap-2">
                    {data.amenities.map((amenity, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-navy/5 text-navy border border-navy/10 group"
                      >
                        {amenity}
                        <button
                          type="button"
                          onClick={() => {
                            const newAmenities = (data.amenities || []).filter((_: string, idx: number) => idx !== i)
                            handleEditField('amenities', newAmenities)
                          }}
                          className="ml-1 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Images at the bottom */}
            {data.images.length > 0 && (
              <div className="mt-6 pt-4 border-t">
                <Label className="text-sm font-medium mb-3 block">Fotos de la Propiedad ({data.images.length})</Label>
                <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                  {data.images.map((img, i) => (
                    <div key={i} className="relative aspect-square group">
                      <img
                        src={img}
                        alt={`Foto ${i + 1}`}
                        className="w-full h-full object-cover rounded-lg border"
                        onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none' }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const newImages = data.images.filter((_, idx) => idx !== i)
                          handleEditField('images', newImages)
                        }}
                        className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data.images.length === 0 && (
              <div className="mt-6 pt-4 border-t">
                <p className="text-sm text-muted-foreground text-center py-4">No se encontraron fotos. Podras subirlas despues de publicar.</p>
              </div>
            )}

            <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
              <Button variant="outline" onClick={() => { setStep('input'); setData(null) }}>
                Cancelar
              </Button>
              <Button onClick={handlePublish} className="bg-green-600 hover:bg-green-700 text-white">
                Importar y Editar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Publishing */}
      {step === 'publishing' && (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="animate-spin w-10 h-10 border-4 border-green-300 border-t-green-600 rounded-full mx-auto mb-4" />
            <p className="text-navy font-medium">Publicando propiedad...</p>
          </CardContent>
        </Card>
      )}

      {/* Step 5: Done */}
      {step === 'done' && (
        <Card className="border-2 border-green-200">
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>
            <p className="text-xl font-semibold text-green-700">Propiedad importada exitosamente</p>
            <p className="text-sm text-muted-foreground mt-1">Redirigiendo al editor...</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function extractFromUrl(url: string): ScrapedData {
  // Extract basic info from the URL slug
  const slug = url.split('/').pop()?.replace(/_JM.*/, '') || ''
  const parts = slug.replace(/MLC-?\d+-/, '').replace(/-/g, ' ')

  const isArriendo = url.toLowerCase().includes('arriendo')

  return {
    title: parts.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    price: 0,
    currency: 'CLP',
    operation: isArriendo ? 'arriendo' : 'venta',
    type: 'departamento',
    bedrooms: 0,
    bathrooms: 0,
    half_bathrooms: 0,
    sqm: 0,
    covered_sqm: null,
    terrace_sqm: null,
    address: '',
    city: '',
    sector: '',
    description: '',
    images: [],
    common_expenses: 0,
    pets_allowed: false,
    parking: 0,
    storage: 0,
    floor_level: null,
    floor_count: null,
    furnished: false,
    year_built: null,
    condition: '',
    amenities: [],
  }
}
