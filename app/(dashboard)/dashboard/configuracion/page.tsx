'use client'

import { useState, useRef } from 'react'
import { useUser } from '@/hooks/use-user'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { Label } from '@/components/ui/label'
import { PageHeader } from '@/components/shared/page-header'
import { Loader2, Save, CheckCircle, Lock, Camera, User } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function ConfiguracionPage() {
  const { profile, loading: profileLoading } = useUser()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [pwLoading, setPwLoading] = useState(false)
  const [pwSuccess, setPwSuccess] = useState(false)
  const [pwError, setPwError] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !profile) return

    setUploading(true)
    const supabase = createClient()
    const ext = file.name.split('.').pop()
    const filePath = `avatars/${profile.id}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('property-images')
      .upload(filePath, file, { upsert: true })

    if (!uploadError) {
      const { data } = supabase.storage.from('property-images').getPublicUrl(filePath)
      const url = `${data.publicUrl}?t=${Date.now()}`
      setAvatarUrl(url)
      await supabase.from('profiles').update({ avatar_url: url }).eq('id', profile.id)
    }
    setUploading(false)
  }

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
        rut: formData.get('rut') as string || null,
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

  const displayAvatar = avatarUrl || profile?.avatar_url

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

              {/* Avatar / Logo */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-gold/20 flex items-center justify-center overflow-hidden border-2 border-gold/30">
                    {displayAvatar ? (
                      <img src={displayAvatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <User className="h-8 w-8 text-gold" />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="absolute -bottom-1 -right-1 w-7 h-7 bg-navy text-white rounded-full flex items-center justify-center hover:bg-navy/80 transition-colors"
                  >
                    {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />}
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </div>
                <div>
                  <p className="text-sm font-medium">Foto de perfil o logo</p>
                  <p className="text-xs text-muted-foreground">JPG, PNG. Max 2MB</p>
                </div>
              </div>

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
                <Label htmlFor="rut">RUT</Label>
                <Input id="rut" name="rut" placeholder="12.345.678-9" defaultValue={profile?.rut || ''} />
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
        <Card className="mt-6">
          <CardHeader><CardTitle className="flex items-center gap-2"><Lock className="h-5 w-5" />Cambiar Contrasena</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={async (e) => {
              e.preventDefault()
              const form = e.currentTarget
              setPwLoading(true)
              setPwError('')
              setPwSuccess(false)
              const formData = new FormData(form)
              const newPw = formData.get('new_password') as string
              const confirmPw = formData.get('confirm_password') as string
              if (newPw !== confirmPw) { setPwError('Las contrasenas no coinciden'); setPwLoading(false); return }
              if (newPw.length < 6) { setPwError('Minimo 6 caracteres'); setPwLoading(false); return }
              try {
                const res = await fetch('/api/change-password', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ password: newPw }),
                })
                const data = await res.json()
                if (data.error) { setPwError(data.error) } else { setPwSuccess(true); form.reset() }
              } catch {
                setPwError('Error de conexion. Intenta de nuevo.')
              }
              setPwLoading(false)
            }} className="space-y-4">
              {pwError && <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">{pwError}</div>}
              {pwSuccess && <div className="bg-green-50 text-green-700 text-sm p-3 rounded-md flex items-center gap-2"><CheckCircle className="h-4 w-4" />Contrasena actualizada correctamente</div>}
              <div className="space-y-2">
                <Label htmlFor="new_password">Nueva Contrasena</Label>
                <PasswordInput id="new_password" name="new_password" placeholder="Minimo 6 caracteres" minLength={6} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm_password">Confirmar Contrasena</Label>
                <PasswordInput id="confirm_password" name="confirm_password" placeholder="Repite tu contrasena" minLength={6} required />
              </div>
              <Button type="submit" disabled={pwLoading}>
                {pwLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}
                Cambiar Contrasena
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
