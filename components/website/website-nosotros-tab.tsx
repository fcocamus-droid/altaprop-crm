'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@/hooks/use-user'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Save, CheckCircle, Loader2, Info } from 'lucide-react'

const MAX_CHARS = 3000

export function WebsiteNosotrosTab() {
  const { profile } = useUser()
  const router = useRouter()
  const supabase = createClient()

  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    if (!profile) return
    setContent((profile as any).website_nosotros_content ?? '')
  }, [profile])

  async function handleSave() {
    if (!profile) return
    setSaving(true)
    setSaveSuccess(false)
    setSaveError('')

    const { error } = await supabase
      .from('profiles')
      .update({ website_nosotros_content: content || null } as any)
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

  const remaining = MAX_CHARS - content.length

  return (
    <div className="max-w-2xl space-y-6">

      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-xl bg-blue-50 border border-blue-200 p-4 text-sm text-blue-800">
        <Info className="h-4 w-4 shrink-0 mt-0.5" />
        <p>
          Este contenido se mostrará en la página <strong>/nosotros</strong> de tu sitio web público.
          Cuéntale a tus visitantes quiénes son, qué valores los representan y por qué confiar en tu empresa.
        </p>
      </div>

      {/* Content textarea */}
      <div className="space-y-2">
        <Label htmlFor="nosotros-content" className="text-sm font-medium">
          Contenido de la página Nosotros
        </Label>
        <Textarea
          id="nosotros-content"
          value={content}
          onChange={e => setContent(e.target.value.slice(0, MAX_CHARS))}
          placeholder={`Ej: Somos una empresa inmobiliaria con más de 10 años de experiencia en el mercado chileno. Nuestro equipo de profesionales está comprometido con encontrar la propiedad ideal para cada cliente, ofreciendo un servicio personalizado y transparente en cada etapa del proceso.\n\nNuestra misión es simplificar la búsqueda y compra de propiedades, conectando a compradores y vendedores con confianza y eficiencia.`}
          className="min-h-[280px] resize-y text-sm leading-relaxed"
          maxLength={MAX_CHARS}
        />
        <p className={`text-right text-xs ${remaining < 200 ? 'text-amber-600' : 'text-muted-foreground'}`}>
          {remaining.toLocaleString()} caracteres restantes
        </p>
      </div>

      {/* Feedback messages */}
      {saveError && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{saveError}</p>
      )}

      {/* Save button */}
      <Button onClick={handleSave} disabled={saving} className="gap-2">
        {saving ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Guardando…</>
        ) : saveSuccess ? (
          <><CheckCircle className="h-4 w-4" /> Guardado</>
        ) : (
          <><Save className="h-4 w-4" /> Guardar cambios</>
        )}
      </Button>

    </div>
  )
}
