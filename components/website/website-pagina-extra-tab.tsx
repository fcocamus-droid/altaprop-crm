'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@/hooks/use-user'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Save, CheckCircle, Loader2, Info, Link2, Type, Trash2 } from 'lucide-react'

export function WebsitePaginaExtraTab() {
  const { profile } = useUser()
  const router = useRouter()
  const supabase = createClient()

  const [name, setName]   = useState('')
  const [url, setUrl]     = useState('')
  const [saving, setSaving]         = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError]   = useState('')

  useEffect(() => {
    if (!profile) return
    setName((profile as any).website_extra_page_name ?? '')
    setUrl((profile as any).website_extra_page_url  ?? '')
  }, [profile])

  async function handleSave() {
    if (!profile) return
    if (url && !/^https?:\/\/.+/.test(url.trim())) {
      setSaveError('El link debe comenzar con http:// o https://')
      return
    }
    setSaving(true)
    setSaveSuccess(false)
    setSaveError('')

    const { error } = await supabase
      .from('profiles')
      .update({
        website_extra_page_name: name.trim() || null,
        website_extra_page_url:  url.trim()  || null,
      } as any)
      .eq('id', profile.id)

    setSaving(false)
    if (error) {
      setSaveError('Error al guardar. Intenta de nuevo.')
    } else {
      setSaveSuccess(true)
      router.refresh()
      setTimeout(() => setSaveSuccess(false), 3000)
    }
  }

  async function handleClear() {
    if (!profile) return
    setSaving(true)
    setSaveError('')
    const { error } = await supabase
      .from('profiles')
      .update({ website_extra_page_name: null, website_extra_page_url: null } as any)
      .eq('id', profile.id)
    setSaving(false)
    if (!error) {
      setName('')
      setUrl('')
      setSaveSuccess(true)
      router.refresh()
      setTimeout(() => setSaveSuccess(false), 3000)
    }
  }

  const isActive = !!(name.trim() && url.trim())

  return (
    <div className="max-w-2xl space-y-6">

      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-xl bg-blue-50 border border-blue-200 p-4 text-sm text-blue-800">
        <Info className="h-4 w-4 shrink-0 mt-0.5" />
        <p>
          Agrega un enlace personalizado en la navegación de tu sitio. Puede apuntar a una página
          externa, un formulario, tu Instagram o cualquier URL. Si dejas los campos vacíos, el enlace
          no aparecerá.
        </p>
      </div>

      {/* Status */}
      {isActive && (
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
          <CheckCircle className="h-4 w-4 shrink-0" />
          El enlace <strong className="mx-1">&ldquo;{name}&rdquo;</strong> está activo en tu sitio → <a href={url} target="_blank" rel="noopener noreferrer" className="underline ml-1 truncate max-w-xs">{url}</a>
        </div>
      )}

      {/* Fields */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="extra-name" className="flex items-center gap-2 text-sm font-medium">
            <Type className="h-4 w-4" />
            Nombre del enlace
          </Label>
          <Input
            id="extra-name"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Ej: Contacto, Blog, Instagram, Tarifas..."
            maxLength={40}
          />
          <p className="text-xs text-muted-foreground">Este texto aparecerá en el menú de navegación y el footer.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="extra-url" className="flex items-center gap-2 text-sm font-medium">
            <Link2 className="h-4 w-4" />
            URL de destino
          </Label>
          <Input
            id="extra-url"
            type="url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://wa.me/56912345678"
          />
          <p className="text-xs text-muted-foreground">El enlace abrirá en una nueva pestaña.</p>
        </div>
      </div>

      {saveError && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{saveError}</p>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Guardando…</>
          ) : saveSuccess ? (
            <><CheckCircle className="h-4 w-4" /> Guardado</>
          ) : (
            <><Save className="h-4 w-4" /> Guardar cambios</>
          )}
        </Button>

        {(name || url) && (
          <Button
            variant="outline"
            onClick={handleClear}
            disabled={saving}
            className="gap-2 text-muted-foreground hover:text-destructive hover:border-destructive"
          >
            <Trash2 className="h-4 w-4" />
            Eliminar enlace
          </Button>
        )}
      </div>

    </div>
  )
}
