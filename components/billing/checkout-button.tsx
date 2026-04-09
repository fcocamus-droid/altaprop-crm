'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

export function CheckoutButton({
  plan,
  billing = 'monthly',
  orgId,
  currentPlan,
}: {
  plan: string
  billing?: string
  orgId: string
  currentPlan: string
}) {
  const [loading, setLoading] = useState(false)
  const isCurrentPlan = plan === currentPlan

  const handleCheckout = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/mercadopago/create-preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, billing, org_id: orgId }),
      })
      const data = await res.json()
      if (data.init_point) {
        window.location.href = data.init_point
      }
    } catch {
      alert('Error al crear el pago')
    }
    setLoading(false)
  }

  if (isCurrentPlan) {
    return (
      <Button
        disabled
        className="w-full bg-green-100 text-green-700 border border-green-300"
      >
        Plan Actual
      </Button>
    )
  }

  return (
    <Button
      onClick={handleCheckout}
      disabled={loading}
      className="w-full bg-navy hover:bg-navy/90 text-white"
    >
      {loading ? 'Procesando...' : 'Seleccionar Plan'}
    </Button>
  )
}
