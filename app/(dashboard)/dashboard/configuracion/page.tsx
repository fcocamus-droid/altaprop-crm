'use client'

import { useState } from 'react'
import { useUser } from '@/hooks/use-user'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageHeader } from '@/components/shared/page-header'
import { Loader2, Save, CheckCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function ConfiguracionPage() {
  const { profile, loading: profileLoading } = useUser()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess(false)

    const formData = new FormData(e.currentTarget)
    const supabase = createClient()

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: formData.get('full_name') as string,
        phone: formData.get('phone') as string,
      })
      .eq('id', profile!.id)

    if (error) {
      setError(error.message)
    } else {
      setSuccess(true)
      router.refresh()
    }
    setLoading(false)
  }

  if (profileLoading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>

  return (
    <div>
      <PageHeader title="Configuracion" description="Administra tu perfil y preferencias" />

      <div className="max-w-2xl">
        <Card>
          <CardHeader><CardTitle>Datos del Perfil</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">{error}</div>}
              {success && <div className="bg-green-50 text-green-700 text-sm p-3 rounded-md flex items-center gap-2"><CheckCircle className="h-4 w-4" />Perfil actualizado correctamente</div>}

              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={profile?.email || ''} disabled />
              </div>
              <div className="space-y-2">
                <Label>Rol</Label>
                <Input value={profile?.role || ''} disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="full_name">Nombre Completo</Label>
                <Input id="full_name" name="full_name" defaultValue={profile?.full_name || ''} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefono</Label>
                <Input id="phone" name="phone" defaultValue={profile?.phone || ''} />
              </div>
              <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Guardar Cambios
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
