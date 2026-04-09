'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createOrganization } from '@/lib/actions/onboarding'

const plans = [
  {
    name: 'Starter',
    slug: 'starter',
    price: 19,
    features: ['1 agente', 'Propiedades ilimitadas', 'CRM básico', 'Soporte por email'],
  },
  {
    name: 'Básico',
    slug: 'basico',
    price: 29,
    features: ['1 agente', 'CRM completo', 'Calendario de visitas', 'Importación automática'],
  },
  {
    name: 'Pro',
    slug: 'pro',
    price: 49,
    popular: true,
    features: ['3 agentes', 'Dominio personalizado', 'Importación automática', 'Soporte prioritario'],
  },
  {
    name: 'Enterprise',
    slug: 'enterprise',
    price: 99,
    features: ['10 agentes', 'API access', 'Onboarding dedicado', 'SLA garantizado'],
  },
]

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full" /></div>}>
      <SignupForm />
    </Suspense>
  )
}

function SignupForm() {
  const searchParams = useSearchParams()
  const initialPlan = searchParams.get('plan') || 'pro'

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    companyName: '',
    fullName: '',
    email: '',
    password: '',
    phone: '',
    plan: initialPlan,
  })

  const updateForm = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setError('')
  }

  const handleNext = () => {
    if (step === 1) {
      if (!form.companyName || !form.fullName || !form.email || !form.password) {
        setError('Todos los campos son obligatorios.')
        return
      }
      if (form.password.length < 6) {
        setError('La contraseña debe tener al menos 6 caracteres.')
        return
      }
    }
    setError('')
    setStep((prev) => prev + 1)
  }

  const handleBack = () => {
    setError('')
    setStep((prev) => prev - 1)
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError('')
    try {
      const result = await createOrganization(form)
      if (result.error) {
        setError(result.error)
        setLoading(false)
        return
      }

      // Starter requires immediate payment
      if (result.requiresPayment && result.orgId) {
        const res = await fetch('/api/mercadopago/create-preference', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan: form.plan, billing: 'monthly', org_id: result.orgId }),
        })
        const data = await res.json()
        if (data.init_point) {
          window.location.href = data.init_point
          return
        }
      }

      window.location.href = '/login?registered=true'
    } catch {
      setError('Ocurrió un error inesperado. Intenta nuevamente.')
      setLoading(false)
    }
  }

  const selectedPlan = plans.find((p) => p.slug === form.plan) || plans[1]

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-lg">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-4">
            Paso {step} de 3
          </div>
          <div className="flex gap-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  s <= step ? 'bg-[#C4A962]' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          {/* Step 1: Account Info */}
          {step === 1 && (
            <>
              <h2 className="text-2xl font-bold text-[#1B2A4A] mb-2">Crea tu cuenta</h2>
              <p className="text-gray-500 text-sm mb-6">{form.plan === 'starter' ? 'Crea tu cuenta y realiza el pago para comenzar.' : 'Comienza tu prueba gratuita de 14 días.'}</p>

              <div className="space-y-4">
                <div>
                  <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre de tu empresa
                  </label>
                  <input
                    id="companyName"
                    type="text"
                    value={form.companyName}
                    onChange={(e) => updateForm('companyName', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C4A962] focus:border-transparent"
                    placeholder="Inmobiliaria Ejemplo"
                  />
                </div>
                <div>
                  <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre completo
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    value={form.fullName}
                    onChange={(e) => updateForm('fullName', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C4A962] focus:border-transparent"
                    placeholder="Juan Pérez"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => updateForm('email', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C4A962] focus:border-transparent"
                    placeholder="juan@ejemplo.cl"
                  />
                </div>
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    Contraseña
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={form.password}
                    onChange={(e) => updateForm('password', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C4A962] focus:border-transparent"
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                    Teléfono <span className="text-gray-400">(opcional)</span>
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    value={form.phone}
                    onChange={(e) => updateForm('phone', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C4A962] focus:border-transparent"
                    placeholder="+56 9 1234 5678"
                  />
                </div>
              </div>
            </>
          )}

          {/* Step 2: Choose Plan */}
          {step === 2 && (
            <>
              <h2 className="text-2xl font-bold text-[#1B2A4A] mb-2">Elige tu plan</h2>
              <p className="text-gray-500 text-sm mb-6">Puedes cambiar de plan en cualquier momento.</p>

              <div className="space-y-3">
                {plans.map((plan) => (
                  <button
                    key={plan.slug}
                    type="button"
                    onClick={() => updateForm('plan', plan.slug)}
                    className={`w-full text-left rounded-xl p-4 border-2 transition ${
                      form.plan === plan.slug
                        ? 'border-[#C4A962] bg-[#C4A962]/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[#1B2A4A]">{plan.name}</span>
                        {plan.popular && (
                          <span className="text-xs bg-[#C4A962] text-[#1B2A4A] px-2 py-0.5 rounded-full font-medium">
                            Popular
                          </span>
                        )}
                      </div>
                      <span className="font-bold text-[#1B2A4A]">${plan.price} <span className="text-xs text-gray-500 font-normal">USD/mes</span></span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {plan.features.map((f) => (
                        <span key={f} className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          {f}
                        </span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Step 3: Summary */}
          {step === 3 && (
            <>
              <h2 className="text-2xl font-bold text-[#1B2A4A] mb-2">Confirma tu cuenta</h2>
              <p className="text-gray-500 text-sm mb-6">Revisa los datos antes de comenzar.</p>

              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Empresa</span>
                    <span className="font-medium text-[#1B2A4A]">{form.companyName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Nombre</span>
                    <span className="font-medium text-[#1B2A4A]">{form.fullName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Email</span>
                    <span className="font-medium text-[#1B2A4A]">{form.email}</span>
                  </div>
                  {form.phone && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Teléfono</span>
                      <span className="font-medium text-[#1B2A4A]">{form.phone}</span>
                    </div>
                  )}
                </div>

                <div className="bg-[#1B2A4A]/5 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-[#1B2A4A]">Plan {selectedPlan.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{form.plan === 'starter' ? 'Pago inmediato' : '14 días de prueba gratis'}</p>
                    </div>
                    <p className="text-xl font-bold text-[#1B2A4A]">
                      ${selectedPlan.price} <span className="text-xs text-gray-500 font-normal">USD/mes</span>
                    </p>
                  </div>
                </div>

                <p className="text-xs text-gray-400 text-center">
                  {form.plan === 'starter' ? 'Se procesará el cobro de $19 USD al confirmar.' : 'No se realizará ningún cobro durante el período de prueba.'}{' '}
                  Al registrarte aceptas nuestros{' '}
                  <Link href="#" className="underline">Términos de Servicio</Link> y{' '}
                  <Link href="#" className="underline">Política de Privacidad</Link>.
                </p>
              </div>
            </>
          )}

          {/* Error */}
          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="mt-6 flex gap-3">
            {step > 1 && (
              <button
                type="button"
                onClick={handleBack}
                className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
              >
                Atrás
              </button>
            )}
            {step < 3 ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex-1 bg-[#1B2A4A] text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-[#1B2A4A]/90 transition"
              >
                Continuar
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 bg-[#C4A962] text-[#1B2A4A] py-2.5 rounded-lg text-sm font-semibold hover:bg-[#d4b972] transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Procesando...' : form.plan === 'starter' ? 'Pagar y Comenzar' : 'Comenzar Trial Gratis'}
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="text-[#1B2A4A] font-medium hover:underline">
            Iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  )
}
