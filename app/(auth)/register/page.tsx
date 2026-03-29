'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { UserPlus, Loader2, CheckCircle, ArrowLeft, ArrowRight } from 'lucide-react'
import { PLANS } from '@/lib/constants'

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <RegisterForm />
    </Suspense>
  )
}

function RegisterForm() {
  const searchParams = useSearchParams()
  const preselectedPlan = searchParams.get('plan')

  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    company_name: '',
    email: '',
    password: '',
    full_name: '',
    phone: '',
    role: 'SUPERADMIN' as string,
    plan: preselectedPlan || '',
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (step === 1) {
      if (!formData.plan) {
        setError('Selecciona un plan para continuar')
        return
      }
      setError('')
      setStep(2)
      return
    }

    setError('')
    setLoading(true)

    const supabase = createClient()
    const siteUrl = window.location.origin
    const { error } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          company_name: formData.company_name,
          full_name: formData.full_name,
          phone: formData.phone,
          role: formData.role,
          plan: formData.plan,
        },
        emailRedirectTo: `${siteUrl}/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
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
          <h2 className="text-xl font-semibold">Cuenta creada</h2>
          <p className="text-muted-foreground">
            Revisa tu email para confirmar tu cuenta. Luego podras iniciar sesion y gestionar tu plan.
          </p>
          <Button asChild className="w-full">
            <Link href="/login">Ir a Iniciar Sesion</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={step === 1 ? 'max-w-2xl' : ''}>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">
          {step === 1 ? 'Elige tu Plan' : 'Crear Cuenta'}
        </CardTitle>
        <CardDescription>
          {step === 1
            ? 'Selecciona el plan que mejor se adapte a tu negocio'
            : 'Completa tus datos para comenzar'
          }
        </CardDescription>
        <div className="flex justify-center gap-2 mt-3">
          <div className={`h-2 w-12 rounded-full ${step >= 1 ? 'bg-navy' : 'bg-gray-200'}`} />
          <div className={`h-2 w-12 rounded-full ${step >= 2 ? 'bg-navy' : 'bg-gray-200'}`} />
        </div>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {PLANS.map((plan) => (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, plan: plan.id })}
                  className={`text-left p-4 rounded-lg border-2 transition-all ${
                    formData.plan === plan.id
                      ? 'border-navy bg-navy/5 ring-2 ring-navy/20'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold">{plan.name}</h3>
                    {'recommended' in plan && plan.recommended && (
                      <span className="text-xs bg-gold text-navy px-2 py-0.5 rounded-full font-medium">Popular</span>
                    )}
                  </div>
                  <p className="text-2xl font-bold text-navy">${plan.price}<span className="text-sm text-muted-foreground font-normal">/mes</span></p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {plan.agents} {plan.agents === 1 ? 'agente' : 'agentes'} -
                    {plan.trial ? ` ${plan.trialDays} dias gratis` : ' Acceso inmediato'}
                  </p>
                </button>
              ))}
            </div>
          )}

          {step === 2 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="company_name">Nombre de tu Empresa</Label>
                <Input id="company_name" name="company_name" placeholder="Mi Inmobiliaria SpA" value={formData.company_name} onChange={handleChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="full_name">Nombre Completo</Label>
                <Input id="full_name" name="full_name" placeholder="Juan Perez" value={formData.full_name} onChange={handleChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" placeholder="tu@email.com" value={formData.email} onChange={handleChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefono</Label>
                <Input id="phone" name="phone" type="tel" placeholder="+56 9 1234 5678" value={formData.phone} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contrasena</Label>
                <Input id="password" name="password" type="password" placeholder="Minimo 6 caracteres" value={formData.password} onChange={handleChange} required minLength={6} />
              </div>
              <div className="bg-muted/50 p-3 rounded-lg text-sm">
                Plan seleccionado: <strong>{PLANS.find(p => p.id === formData.plan)?.name}</strong> - ${PLANS.find(p => p.id === formData.plan)?.price}/mes
              </div>
            </>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <div className="flex gap-2 w-full">
            {step === 2 && (
              <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1">
                <ArrowLeft className="mr-2 h-4 w-4" />Volver
              </Button>
            )}
            <Button type="submit" className="flex-1" disabled={loading}>
              {step === 1 ? (
                <>Continuar <ArrowRight className="ml-2 h-4 w-4" /></>
              ) : loading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creando...</>
              ) : (
                <><UserPlus className="mr-2 h-4 w-4" />Crear Cuenta</>
              )}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Ya tienes cuenta?{' '}
            <Link href="/login" className="text-primary hover:underline font-medium">
              Inicia sesion
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
