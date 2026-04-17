'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PasswordInput } from '@/components/ui/password-input'
import { Home, Loader2, CheckCircle, ShieldCheck, Star, Clock } from 'lucide-react'
import { formatRut, validateRut, formatPhone, validatePhone } from '@/lib/validations/chilean-formats'

export default function RegistroPropietarioPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-white" /></div>}>
      <RegistroForm />
    </Suspense>
  )
}

function RegistroForm() {
  const searchParams = useSearchParams()
  const subscriberParam = searchParams.get('subscriber')

  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    full_name: '',
    rut: '',
    email: '',
    phone: '',
    password: '',
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    if (name === 'rut') {
      setForm({ ...form, rut: formatRut(value) })
    } else if (name === 'phone') {
      setForm({ ...form, phone: formatPhone(value) })
    } else {
      setForm({ ...form, [name]: value })
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    // Validations
    if (!form.full_name || !form.rut || !form.email || !form.phone || !form.password) {
      setError('Completa todos los campos obligatorios')
      return
    }
    if (!validateRut(form.rut)) {
      setError('RUT inválido. Formato: 12.345.678-9')
      return
    }
    if (!validatePhone(form.phone)) {
      setError('Teléfono inválido. Formato: +56 9 1234 5678')
      return
    }
    if (form.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }

    setLoading(true)

    const supabase = createClient()
    const siteUrl = window.location.origin
    const { error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          role: 'PROPIETARIO',
          full_name: form.full_name,
          rut: form.rut,
          phone: form.phone,
          subscriber_id: subscriberParam || null,
        },
        emailRedirectTo: `${siteUrl}/auth/callback`,
      },
    })

    setLoading(false)

    if (signUpError) {
      setError(
        signUpError.message === 'User already registered'
          ? 'Este email ya está registrado. Intenta iniciar sesión.'
          : signUpError.message
      )
      return
    }

    setSuccess(true)
  }

  if (success) {
    return (
      <Card className="max-w-lg">
        <CardContent className="pt-8 pb-6 text-center space-y-5">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="h-9 w-9 text-green-600" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">¡Cuenta creada exitosamente!</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Revisa tu correo <strong>{form.email}</strong> y haz click en el enlace de confirmación para activar tu cuenta.
            </p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700 text-left space-y-2">
            <p className="font-semibold">Próximos pasos:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Confirma tu email</li>
              <li>Inicia sesión</li>
              <li>Publica tu propiedad desde tu panel</li>
            </ol>
          </div>
          <Button asChild className="w-full bg-gold text-navy hover:bg-gold/90 font-semibold">
            <Link href="/login">Ir a Iniciar Sesión</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="w-full max-w-lg space-y-4">
      {/* Benefits banner */}
      <div className="grid grid-cols-3 gap-2 text-center text-xs text-white/80">
        <div className="flex flex-col items-center gap-1">
          <ShieldCheck className="h-5 w-5 text-gold" />
          <span>100% gratuito</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <Star className="h-5 w-5 text-gold" />
          <span>Mayor visibilidad</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <Clock className="h-5 w-5 text-gold" />
          <span>Rápido y fácil</span>
        </div>
      </div>

      <Card>
        <CardHeader className="text-center pb-4">
          <div className="w-14 h-14 bg-gold/20 rounded-xl flex items-center justify-center mx-auto mb-3">
            <Home className="h-7 w-7 text-gold" />
          </div>
          <CardTitle className="text-2xl">Publica Gratis tu Propiedad</CardTitle>
          <CardDescription>
            Crea tu cuenta — luego sube tu propiedad desde el panel
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">{error}</div>
            )}

            <div className="space-y-2">
              <Label htmlFor="full_name">Nombre Completo *</Label>
              <Input
                id="full_name"
                name="full_name"
                placeholder="Juan Pérez López"
                value={form.full_name}
                onChange={handleChange}
                required
                autoComplete="name"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="rut">RUT *</Label>
                <Input
                  id="rut"
                  name="rut"
                  placeholder="12.345.678-9"
                  value={form.rut}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono *</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="+56 9 1234 5678"
                  value={form.phone}
                  onChange={handleChange}
                  required
                  autoComplete="tel"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="tu@email.com"
                value={form.email}
                onChange={handleChange}
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña *</Label>
              <PasswordInput
                id="password"
                name="password"
                placeholder="Mínimo 6 caracteres"
                value={form.password}
                onChange={handleChange}
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-3 pt-2">
            <Button
              type="submit"
              className="w-full bg-gold text-navy hover:bg-gold/90 font-semibold text-base h-11"
              disabled={loading}
            >
              {loading
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creando cuenta...</>
                : <><Home className="mr-2 h-4 w-4" />Crear mi Cuenta</>
              }
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              ¿Ya tienes cuenta?{' '}
              <Link href="/login" className="text-primary hover:underline font-medium">
                Inicia sesión
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
