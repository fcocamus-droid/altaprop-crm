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
  sqm: number
  address: string
  city: string
  sector: string
  description: string
  images: string[]
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

    const result = await importProperty(data)

    if (result.error) {
      setError(result.error)
      setStep('preview')
      return
    }

    setStep('done')
    setTimeout(() => {
      router.push('/dashboard/propiedades')
      router.refresh()
    }, 2000)
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
                  Publicar Propiedad
                </Button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-md mb-4">
                {error}
              </div>
            )}

            {/* Images Preview */}
            {data.images.length > 0 && (
              <div className="mb-4">
                <Label className="text-sm font-medium mb-2 block">Imágenes ({data.images.length})</Label>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {data.images.slice(0, 6).map((img, i) => (
                    <img
                      key={i}
                      src={img}
                      alt={`Imagen ${i + 1}`}
                      className="w-24 h-24 object-cover rounded-lg flex-shrink-0 border"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                    />
                  ))}
                  {data.images.length > 6 && (
                    <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 text-sm text-gray-500">
                      +{data.images.length - 6} más
                    </div>
                  )}
                </div>
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
                  <option value="oficina">Oficina</option>
                  <option value="local">Local</option>
                  <option value="terreno">Terreno</option>
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
                <Label className="text-sm">Superficie (m²)</Label>
                <Input type="number" value={data.sqm} onChange={(e) => handleEditField('sqm', Number(e.target.value))} />
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

              <div className="md:col-span-2 space-y-1">
                <Label className="text-sm">Descripción</Label>
                <textarea
                  value={data.description}
                  onChange={(e) => handleEditField('description', e.target.value)}
                  rows={3}
                  className="w-full border rounded-md px-3 py-2 text-sm resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
              <Button variant="outline" onClick={() => { setStep('input'); setData(null) }}>
                Cancelar
              </Button>
              <Button onClick={handlePublish} className="bg-green-600 hover:bg-green-700 text-white">
                Publicar Propiedad
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
            <p className="text-xl font-semibold text-green-700">Propiedad publicada exitosamente</p>
            <p className="text-sm text-muted-foreground mt-1">Redirigiendo al listado...</p>
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
    sqm: 0,
    address: '',
    city: '',
    sector: '',
    description: '',
    images: [],
  }
}
