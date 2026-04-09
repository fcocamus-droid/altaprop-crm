'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PROPERTY_TYPES, OPERATION_TYPES, CURRENCIES } from '@/lib/constants'
import { createProperty, updateProperty } from '@/lib/actions/properties'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Upload, X, Globe } from 'lucide-react'
import type { Property } from '@/types'

const MAX_IMAGES = 20

interface PropertyFormProps {
  property?: Property
}

export function PropertyForm({ property }: PropertyFormProps) {
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')
  const [selectedImages, setSelectedImages] = useState<File[]>([])
  const router = useRouter()
  const isEditing = !!property
  const [websiteVisible, setWebsiteVisible] = useState(property?.website_visible !== false)

  async function compressImage(file: File): Promise<File> {
    if (!file.type.startsWith('image/')) return file
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let { width, height } = img
        const max = 1200
        if (width > max) { height = (height * max) / width; width = max }
        canvas.width = width
        canvas.height = height
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
        canvas.toBlob(blob => resolve(blob ? new File([blob], file.name, { type: 'image/jpeg' }) : file), 'image/jpeg', 0.7)
      }
      img.onerror = () => resolve(file)
      img.src = URL.createObjectURL(file)
    })
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)

    if (selectedImages.length > 0) {
      setProgress('Comprimiendo imágenes...')

      // Compress all images
      const compressed = await Promise.all(selectedImages.map(img => compressImage(img)))

      // Upload directly to Supabase Storage from client (much faster)
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
      // Pass URLs instead of files
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

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    setSelectedImages(prev => {
      const combined = [...prev, ...files]
      if (combined.length > MAX_IMAGES) {
        setError(`Máximo ${MAX_IMAGES} imágenes permitidas`)
        return combined.slice(0, MAX_IMAGES)
      }
      setError('')
      return combined
    })
    e.target.value = ''
  }

  function removeImage(index: number) {
    setSelectedImages(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Informacion General</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">{error}</div>
            )}
            <div className="space-y-2">
              <Label htmlFor="title">Titulo *</Label>
              <Input id="title" name="title" defaultValue={property?.title} placeholder="Ej: Departamento 3D 2B en Las Condes" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descripcion</Label>
              <Textarea id="description" name="description" defaultValue={property?.description || ''} placeholder="Describe la propiedad..." rows={4} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Tipo *</Label>
                <select id="type" name="type" defaultValue={property?.type || ''} required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">Seleccionar</option>
                  {PROPERTY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="operation">Operacion *</Label>
                <select id="operation" name="operation" defaultValue={property?.operation || ''} required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">Seleccionar</option>
                  {OPERATION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Moneda</Label>
                <select id="currency" name="currency" defaultValue={property?.currency || 'CLP'} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  {CURRENCIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Precio *</Label>
              <Input id="price" name="price" type="number" defaultValue={property?.price} placeholder="0" required min={0} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ubicacion</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="address">Direccion</Label>
              <Input id="address" name="address" defaultValue={property?.address || ''} placeholder="Av. Apoquindo 1234" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">Ciudad</Label>
              <Input id="city" name="city" defaultValue={property?.city || ''} placeholder="Santiago" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sector">Sector / Comuna</Label>
              <Input id="sector" name="sector" defaultValue={property?.sector || ''} placeholder="Las Condes" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Caracteristicas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bedrooms">Dormitorios</Label>
              <Input id="bedrooms" name="bedrooms" type="number" defaultValue={property?.bedrooms ?? ''} min={0} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bathrooms">Banos</Label>
              <Input id="bathrooms" name="bathrooms" type="number" defaultValue={property?.bathrooms ?? ''} min={0} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sqm">Superficie (m²)</Label>
              <Input id="sqm" name="sqm" type="number" defaultValue={property?.sqm ?? ''} min={0} step="0.1" />
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Imagenes {selectedImages.length > 0 && <span className="text-sm font-normal text-muted-foreground">({selectedImages.length}/{MAX_IMAGES})</span>}</CardTitle>
          </CardHeader>
          <CardContent>
            {property?.images && property.images.length > 0 && (
              <div className="grid grid-cols-3 md:grid-cols-4 gap-3 mb-4">
                {property.images.map((img) => (
                  <div key={img.id} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                    <img src={img.url} alt="" className="object-cover w-full h-full" />
                  </div>
                ))}
              </div>
            )}
            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground mb-2">Arrastra imagenes o haz click (máx. {MAX_IMAGES})</p>
              <input type="file" accept="image/*" multiple onChange={handleImageChange} className="hidden" id="image-upload" />
              <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById('image-upload')?.click()}>
                Seleccionar Imagenes
              </Button>
            </div>
            {selectedImages.length > 0 && (
              <div className="grid grid-cols-3 md:grid-cols-4 gap-3 mt-4">
                {selectedImages.map((file, i) => (
                  <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                    <img src={URL.createObjectURL(file)} alt="" className="object-cover w-full h-full" />
                    <button type="button" onClick={() => removeImage(i)} className="absolute top-1 right-1 bg-destructive text-white rounded-full p-1">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-gold" />
              Publicación en Sitio Web
            </CardTitle>
          </CardHeader>
          <CardContent>
            <input type="hidden" name="website_visible" value={websiteVisible.toString()} />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Mostrar en el sitio web público</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {websiteVisible
                    ? 'Esta propiedad aparece en tu sitio web si el sitio está activo.'
                    : 'Esta propiedad está oculta y no aparece en tu sitio web.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setWebsiteVisible(v => !v)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  websiteVisible ? 'bg-gold' : 'bg-gray-300'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${websiteVisible ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          </CardContent>
        </Card>

      </div>

      <div className="flex justify-end gap-3 mt-6">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>Cancelar</Button>
        <Button type="submit" disabled={loading}>
          {loading ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{progress}</>
          ) : (
            isEditing ? 'Guardar Cambios' : 'Publicar Propiedad'
          )}
        </Button>
      </div>
    </form>
  )
}
