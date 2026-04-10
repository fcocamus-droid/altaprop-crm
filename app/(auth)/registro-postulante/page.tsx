'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PasswordInput } from '@/components/ui/password-input'
import { UserPlus, Loader2, CheckCircle, ArrowLeft, ArrowRight } from 'lucide-react'
import { formatRut, validateRut, formatPhone, validatePhone } from '@/lib/validations/chilean-formats'

const MARITAL_OPTIONS = [
  { value: 'soltero', label: 'Soltero/a' },
  { value: 'casado', label: 'Casado/a' },
  { value: 'divorciado', label: 'Divorciado/a' },
  { value: 'viudo', label: 'Viudo/a' },
  { value: 'conviviente', label: 'Conviviente Civil' },
]

const HOUSING_OPTIONS = [
  { value: 'arrendatario', label: 'Arrendatario' },
  { value: 'propietario', label: 'Propietario' },
  { value: 'allegado', label: 'Allegado' },
]

export default function RegistroPostulantePage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-white" /></div>}>
      <RegistroForm />
    </Suspense>
  )
}

function RegistroForm() {
  const searchParams = useSearchParams()
  const propertyId = searchParams.get('property')
  const redirectTo = searchParams.get('redirect')   // path to return to after verification
  const router = useRouter()

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
    birth_date: '',
    marital_status: '',
    nationality: 'Chilena',
    occupation: '',
    employer: '',
    employment_years: '',
    monthly_income: '',
    housing_status: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target
    if (name === 'rut') {
      setForm({ ...form, rut: formatRut(value) })
    } else if (name === 'phone' || name === 'emergency_contact_phone') {
      setForm({ ...form, [name]: formatPhone(value) })
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

    if (step === 2) {
      if (!form.occupation || !form.monthly_income) {
        setError('Completa ocupación y renta mensual')
        return
      }
      setError('')
      setStep(3)
      return
    }

    // Step 3 - submit
    setError('')
    setLoading(true)

    const supabase = createClient()
    const siteUrl = window.location.origin
    const { error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          role: 'POSTULANTE',
          full_name: form.full_name,
          rut: form.rut,
          phone: form.phone,
          birth_date: form.birth_date || null,
          marital_status: form.marital_status || null,
          nationality: form.nationality || 'Chilena',
          occupation: form.occupation || null,
          employer: form.employer || null,
          employment_years: form.employment_years ? parseInt(form.employment_years) : null,
          monthly_income: form.monthly_income ? parseInt(form.monthly_income) : null,
          housing_status: form.housing_status || null,
          emergency_contact_name: form.emergency_contact_name || null,
          emergency_contact_phone: form.emergency_contact_phone || null,
        },
        emailRedirectTo: [
          `${siteUrl}/auth/callback`,
          redirectTo ? `?next=${encodeURIComponent(redirectTo)}` : '',
          propertyId ? `${redirectTo ? '&' : '?'}property=${propertyId}` : '',
        ].join(''),
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
          <h2 className="text-xl font-semibold">¡Cuenta creada!</h2>
          <p className="text-muted-foreground">
            Revisa tu email y haz clic en el enlace de confirmación.
            {propertyId && ' Tu postulación quedará registrada automáticamente al verificar.'}
          </p>
          <Button asChild className="w-full">
            <Link href={redirectTo ? `/login?redirect=${encodeURIComponent(redirectTo)}` : '/login'}>
              Ir a Iniciar Sesión
            </Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="max-w-lg">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Registro de Postulante</CardTitle>
        <CardDescription>
          {step === 1 && 'Datos personales y acceso'}
          {step === 2 && 'Información laboral'}
          {step === 3 && 'Vivienda y contacto de emergencia'}
        </CardDescription>
        <div className="flex justify-center gap-2 mt-3">
          {[1, 2, 3].map(s => (
            <div key={s} className={`h-2 w-10 rounded-full transition-all ${step >= s ? 'bg-gold' : 'bg-white/20'}`} />
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
                <Input id="full_name" name="full_name" placeholder="Juan Antonio Pérez López" value={form.full_name} onChange={handleChange} required />
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
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="birth_date">Fecha de Nacimiento</Label>
                  <Input id="birth_date" name="birth_date" type="date" value={form.birth_date} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nationality">Nacionalidad</Label>
                  <Input id="nationality" name="nationality" placeholder="Chilena" value={form.nationality} onChange={handleChange} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="marital_status">Estado Civil</Label>
                <select id="marital_status" name="marital_status" value={form.marital_status} onChange={handleChange}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">Seleccionar...</option>
                  {MARITAL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="occupation">Ocupación / Cargo *</Label>
                <Input id="occupation" name="occupation" placeholder="Ingeniero, Contador, Vendedor..." value={form.occupation} onChange={handleChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="employer">Empresa donde trabaja</Label>
                <Input id="employer" name="employer" placeholder="Nombre de la empresa" value={form.employer} onChange={handleChange} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="employment_years">Antigüedad (años)</Label>
                  <Input id="employment_years" name="employment_years" type="number" placeholder="3" min="0" value={form.employment_years} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="monthly_income">Renta Líquida Mensual *</Label>
                  <Input id="monthly_income" name="monthly_income" type="number" placeholder="800000" min="0" value={form.monthly_income} onChange={handleChange} required />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">La renta líquida es el monto que recibes después de descuentos legales (AFP, salud, impuestos).</p>
            </>
          )}

          {step === 3 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="housing_status">Situación Habitacional Actual</Label>
                <select id="housing_status" name="housing_status" value={form.housing_status} onChange={handleChange}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">Seleccionar...</option>
                  {HOUSING_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="border-t pt-4 mt-2">
                <p className="text-sm font-medium mb-3">Contacto de Emergencia</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="emergency_contact_name">Nombre</Label>
                    <Input id="emergency_contact_name" name="emergency_contact_name" placeholder="María López" value={form.emergency_contact_name} onChange={handleChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emergency_contact_phone">Teléfono</Label>
                    <Input id="emergency_contact_phone" name="emergency_contact_phone" type="tel" placeholder="+56 9 8765 4321" value={form.emergency_contact_phone} onChange={handleChange} />
                  </div>
                </div>
              </div>
              <div className="bg-muted/50 p-3 rounded-lg text-sm space-y-1 mt-2">
                <p><strong>Resumen:</strong></p>
                <p>{form.full_name} — RUT: {form.rut}</p>
                <p>{form.occupation}{form.employer ? ` en ${form.employer}` : ''}</p>
                <p>Renta: ${parseInt(form.monthly_income || '0').toLocaleString('es-CL')}/mes</p>
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
            <Button type="submit" className="flex-1" disabled={loading}>
              {step < 3 ? (
                <>Continuar <ArrowRight className="ml-2 h-4 w-4" /></>
              ) : loading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creando cuenta...</>
              ) : (
                <><UserPlus className="mr-2 h-4 w-4" />Crear Cuenta</>
              )}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground text-center">
            ¿Ya tienes cuenta?{' '}
            <Link href={redirectTo ? `/login?redirect=${encodeURIComponent(redirectTo)}` : '/login'} className="text-primary hover:underline font-medium">
              Inicia sesión
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
