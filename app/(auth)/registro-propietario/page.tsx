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
import { PROPERTY_TYPES, OPERATION_TYPES } from '@/lib/constants'
import { Home, Loader2, CheckCircle, ArrowLeft, ArrowRight } from 'lucide-react'
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

  const [step, setStep] = useState(1)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    full_name: '',
    rut: '',
    email: '',
    phone: '',
    password: '',
    property_address: '',
    property_city: '',
    property_sector: '',
    property_type: 'departamento',
    property_operation: 'arriendo',
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
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

    if (step === 1) {
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
      setError('')
      setStep(2)
      return
    }

    // Step 2 - submit
    if (!form.property_address || !form.property_city) {
      setError('Ingresa la dirección y ciudad de tu propiedad')
      return
    }

    setError('')
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
          property_address: form.property_address,
          property_city: form.property_city,
          property_sector: form.property_sector,
          property_type: form.property_type,
          property_operation: form.property_operation,
        },
        emailRedirectTo: `${siteUrl}/auth/callback`,
      },
    })

    if (signUpError) {
      setError(signUpError.message === 'User already registered'
        ? 'Este email ya está registrado. Intenta iniciar sesión.'
        : signUpError.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <Card>
        <CardContent className="pt-6 text-center space-y-4">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
          <h2 className="text-xl font-semibold">Cuenta creada exitosamente</h2>
          <p className="text-muted-foreground">
            Revisa tu email para confirmar tu cuenta. Luego podrás iniciar sesión y gestionar tu propiedad.
          </p>
          <Button asChild className="w-full">
            <Link href="/login">Ir a Iniciar Sesión</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="max-w-lg">
      <CardHeader className="text-center">
        <div className="w-14 h-14 bg-gold/20 rounded-xl flex items-center justify-center mx-auto mb-3">
          <Home className="h-7 w-7 text-gold" />
        </div>
        <CardTitle className="text-2xl">Publica Gratis tu Propiedad</CardTitle>
        <CardDescription>
          {step === 1 ? 'Tus datos personales' : 'Datos de tu propiedad'}
        </CardDescription>
        <div className="flex justify-center gap-2 mt-3">
          {[1, 2].map(s => (
            <div key={s} className={`h-2 w-12 rounded-full transition-all ${step >= s ? 'bg-gold' : 'bg-white/20'}`} />
          ))}
        </div>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">{error}</div>
          )}

          {step === 1 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="full_name">Nombre Completo *</Label>
                <Input id="full_name" name="full_name" placeholder="Juan Pérez López" value={form.full_name} onChange={handleChange} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="rut">RUT *</Label>
                  <Input id="rut" name="rut" placeholder="12.345.678-9" value={form.rut} onChange={handleChange} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono *</Label>
                  <Input id="phone" name="phone" type="tel" placeholder="+56 9 1234 5678" value={form.phone} onChange={handleChange} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input id="email" name="email" type="email" placeholder="tu@email.com" value={form.email} onChange={handleChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña *</Label>
                <PasswordInput id="password" name="password" placeholder="Mínimo 6 caracteres" value={form.password} onChange={handleChange} required minLength={6} />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="property_address">Dirección de la propiedad *</Label>
                <Input id="property_address" name="property_address" placeholder="Av. Providencia 1234, Depto 501" value={form.property_address} onChange={handleChange} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="property_city">Ciudad *</Label>
                  <Input id="property_city" name="property_city" placeholder="Santiago" value={form.property_city} onChange={handleChange} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="property_sector">Comuna / Sector</Label>
                  <Input id="property_sector" name="property_sector" placeholder="Providencia" value={form.property_sector} onChange={handleChange} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="property_type">Tipo de propiedad</Label>
                  <select id="property_type" name="property_type" value={form.property_type} onChange={handleChange}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    {PROPERTY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="property_operation">Operación</Label>
                  <select id="property_operation" name="property_operation" value={form.property_operation} onChange={handleChange}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    {OPERATION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
                Tu propiedad será revisada y publicada por nuestro equipo. ¡Es 100% gratis!
              </div>
            </>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-3">
          <div className="flex gap-2 w-full">
            {step > 1 && (
              <Button type="button" variant="outline" onClick={() => { setStep(step - 1); setError('') }} className="flex-1">
                <ArrowLeft className="mr-2 h-4 w-4" />Volver
              </Button>
            )}
            <Button type="submit" className="flex-1 bg-gold text-navy hover:bg-gold/90 font-semibold" disabled={loading}>
              {step < 2 ? (
                <>Continuar <ArrowRight className="ml-2 h-4 w-4" /></>
              ) : loading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creando cuenta...</>
              ) : (
                <><Home className="mr-2 h-4 w-4" />Publicar mi Propiedad</>
              )}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground text-center">
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" className="text-primary hover:underline font-medium">Inicia sesión</Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
