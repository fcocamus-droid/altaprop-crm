'use client'

import { useState, useRef, useEffect } from 'react'
import { useUser } from '@/hooks/use-user'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { Label } from '@/components/ui/label'
import { PageHeader } from '@/components/shared/page-header'
import { Loader2, Save, CheckCircle, Lock, Camera, User, Landmark } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { formatRut, validateRut, formatPhone, validatePhone } from '@/lib/validations/chilean-formats'


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
  const [avatarError, setAvatarError] = useState('')
  const [avatarSuccess, setAvatarSuccess] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const mlConnected = searchParams.get('ml_connected') === 'true'
  const mlError = searchParams.get('ml_error')

  // Profile field state for controlled inputs
  const [rutValue, setRutValue] = useState('')
  const [rutError, setRutError] = useState('')
  const [phoneValue, setPhoneValue] = useState('')
  const [phoneError, setPhoneError] = useState('')

  // Initialize controlled fields from profile
  useEffect(() => {
    if (profile) {
      setRutValue(profile.rut ? formatRut(profile.rut) : '')
      setPhoneValue(profile.phone ? formatPhone(profile.phone) : '')
    }
  }, [profile])

  // Bank account state
  const [bankLoading, setBankLoading] = useState(false)
  const [bankSuccess, setBankSuccess] = useState(false)
  const [bankError, setBankError] = useState('')

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !profile) return

    // Client-side validation before sending
    if (file.size > 2 * 1024 * 1024) {
      setAvatarError('El archivo supera el límite de 2 MB.')
      return
    }
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      setAvatarError('Tipo de archivo no permitido. Usa JPG, PNG o WebP.')
      return
    }

    setUploading(true)
    setAvatarError('')
    setAvatarSuccess(false)

    const body = new FormData()
    body.append('file', file)

    try {
      const res = await fetch('/api/upload/avatar', { method: 'POST', body })
      const data = await res.json()

      if (!res.ok || data.error) {
        setAvatarError(data.error || 'Error al subir la imagen. Intenta de nuevo.')
      } else {
        setAvatarUrl(data.url)
        setAvatarSuccess(true)
        setTimeout(() => setAvatarSuccess(false), 3000)
        router.refresh()
      }
    } catch {
      setAvatarError('Error de conexión. Intenta de nuevo.')
    } finally {
      setUploading(false)
      // Reset input so same file can be re-selected after error
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setRutError('')
    setPhoneError('')

    // Validate RUT if provided
    if (rutValue && !validateRut(rutValue)) {
      setRutError('RUT inválido')
      return
    }
    // Validate phone if provided
    if (phoneValue && !validatePhone(phoneValue)) {
      setPhoneError('Teléfono inválido. Formato: +56 9 XXXX XXXX')
      return
    }

    setLoading(true)
    setError('')
    setSuccess(false)

    const formData = new FormData(e.currentTarget)
    const supabase = createClient()

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: formData.get('full_name') as string,
        rut: rutValue || null,
        phone: phoneValue || null,
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

  async function handleBankSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setBankLoading(true)
    setBankError('')
    setBankSuccess(false)

    const formData = new FormData(e.currentTarget)
    const supabase = createClient()

    const { error } = await supabase
      .from('profiles')
      .update({
        bank_name: formData.get('bank_name') as string || null,
        bank_account_type: formData.get('bank_account_type') as string || null,
        bank_account_holder: formData.get('bank_account_holder') as string || null,
        bank_account_rut: formData.get('bank_account_rut') as string || null,
        bank_account_number: formData.get('bank_account_number') as string || null,
        bank_email: formData.get('bank_email') as string || null,
      })
      .eq('id', profile!.id)

    if (error) {
      setBankError(error.message)
    } else {
      setBankSuccess(true)
      setTimeout(() => setBankSuccess(false), 4000)
      router.refresh()
    }
    setBankLoading(false)
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
                  <p className="text-xs text-muted-foreground">JPG, PNG, WebP. Max 2MB</p>
                  {avatarError && (
                    <p className="text-xs text-destructive mt-1">{avatarError}</p>
                  )}
                  {avatarSuccess && (
                    <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />Imagen actualizada
                    </p>
                  )}
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
                <Input
                  id="rut"
                  placeholder="12.345.678-9"
                  value={rutValue}
                  onChange={e => { setRutError(''); setRutValue(formatRut(e.target.value)) }}
                  className={rutError ? 'border-red-500' : ''}
                />
                {rutError && <p className="text-xs text-red-500">{rutError}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  placeholder="+56 9 1234 5678"
                  value={phoneValue}
                  onChange={e => { setPhoneError(''); setPhoneValue(formatPhone(e.target.value)) }}
                  className={phoneError ? 'border-red-500' : ''}
                />
                {phoneError && <p className="text-xs text-red-500">{phoneError}</p>}
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
        {/* ML CONNECTED NOTIFICATION */}
        {mlConnected && (
          <div className="mt-4 bg-green-50 text-green-700 text-sm p-3 rounded-md flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            ¡Cuenta de MercadoLibre / Portal Inmobiliario conectada correctamente!
          </div>
        )}
        {mlError && (
          <div className="mt-4 bg-destructive/10 text-destructive text-sm p-3 rounded-md">
            Error al conectar MercadoLibre: {mlError}. Intenta de nuevo.
          </div>
        )}

        {/* PORTALES DE PUBLICACIÓN — moved to /dashboard/portales */}

        {/* BANK ACCOUNT CARD — visible for PROPIETARIO, POSTULANTE, SUPERADMIN, SUPERADMINBOSS */}
        {['PROPIETARIO', 'POSTULANTE', 'SUPERADMIN', 'SUPERADMINBOSS'].includes(profile?.role || '') && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Landmark className="h-5 w-5" />
                Datos Bancarios
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {profile?.role === 'PROPIETARIO'
                  ? 'Esta información será visible para los postulantes aprobados en tus propiedades para que puedan realizar el pago.'
                  : 'Ingresa tus datos bancarios para recibir o realizar transferencias relacionadas a tus postulaciones.'}
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleBankSubmit} className="space-y-4">
                {bankError && (
                  <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">{bankError}</div>
                )}
                {bankSuccess && (
                  <div className="bg-green-50 text-green-700 text-sm p-3 rounded-md flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />Datos bancarios guardados correctamente
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="bank_name">Banco</Label>
                  <Input
                    id="bank_name"
                    name="bank_name"
                    placeholder="Ej: BancoEstado, Santander, BCI..."
                    defaultValue={profile?.bank_name || ''}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bank_account_type">Tipo de cuenta</Label>
                  <select
                    id="bank_account_type"
                    name="bank_account_type"
                    defaultValue={profile?.bank_account_type || ''}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="">Seleccionar tipo...</option>
                    <option value="Cuenta Corriente">Cuenta Corriente</option>
                    <option value="Cuenta de Ahorro">Cuenta de Ahorro</option>
                    <option value="Cuenta Vista / RUT">Cuenta Vista / RUT</option>
                    <option value="Cuenta Empresas">Cuenta Empresas</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bank_account_holder">Nombre destinatario</Label>
                  <Input
                    id="bank_account_holder"
                    name="bank_account_holder"
                    placeholder="Nombre completo del titular"
                    defaultValue={profile?.bank_account_holder || ''}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bank_account_rut">RUT destinatario</Label>
                  <Input
                    id="bank_account_rut"
                    name="bank_account_rut"
                    placeholder="12.345.678-9"
                    defaultValue={profile?.bank_account_rut || ''}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bank_account_number">Número de cuenta</Label>
                  <Input
                    id="bank_account_number"
                    name="bank_account_number"
                    placeholder="Número de cuenta bancaria"
                    defaultValue={profile?.bank_account_number || ''}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bank_email">Correo electrónico</Label>
                  <Input
                    id="bank_email"
                    name="bank_email"
                    type="email"
                    placeholder="correo@banco.com"
                    defaultValue={profile?.bank_email || ''}
                  />
                </div>

                <Button type="submit" disabled={bankLoading}>
                  {bankLoading
                    ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</>
                    : <><Save className="mr-2 h-4 w-4" />Guardar Datos Bancarios</>
                  }
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
