'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Save, CheckCircle } from 'lucide-react'

interface Props {
  profile: {
    id: string
    email: string
    role: string
    full_name: string | null
    rut: string | null
    phone: string | null
  }
}

export function ProfileForm({ profile }: Props) {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const supabaseRef = useRef(createClient())

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSaved(false)

    const formData = new FormData(e.currentTarget)

    const { error } = await supabaseRef.current
      .from('profiles')
      .update({
        full_name: formData.get('full_name') as string,
        rut: formData.get('rut') as string,
        phone: formData.get('phone') as string,
      })
      .eq('id', profile.id)

    setSaving(false)

    if (error) {
      setError(error.message)
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
  }

  return (
    <Card>
      <CardHeader><CardTitle>Datos del Perfil</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">{error}</div>}
          {saved && <div className="bg-green-50 text-green-700 text-sm p-3 rounded-md flex items-center gap-2"><CheckCircle className="h-4 w-4" />Perfil actualizado correctamente</div>}

          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={profile.email} disabled />
          </div>
          <div className="space-y-2">
            <Label>Rol</Label>
            <Input value={profile.role} disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="full_name">Nombre Completo</Label>
            <Input id="full_name" name="full_name" defaultValue={profile.full_name || ''} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rut">RUT</Label>
            <Input id="rut" name="rut" defaultValue={profile.rut || ''} placeholder="12.345.678-9" maxLength={12} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono</Label>
            <Input id="phone" name="phone" defaultValue={profile.phone || ''} />
          </div>
          <Button type="submit" disabled={saving}>
            {saved ? <CheckCircle className="mr-2 h-4 w-4 text-green-500" /> : <Save className="mr-2 h-4 w-4" />}
            {saving ? 'Guardando...' : saved ? 'Guardado' : 'Guardar Cambios'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
