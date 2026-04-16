import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const type = searchParams.get('type') // 'other_service' or undefined (commission)
  const appId = searchParams.get('app_id')
  const payer = searchParams.get('payer')
  const paymentId = searchParams.get('payment_id') // for other_service
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.altaprop-app.cl'

  const claimId = searchParams.get('claim_id') // for red_canjes type

  if (status === 'success') {
    try {
      const admin = createAdminClient()

      if (type === 'red_canjes' && claimId) {
        // Mark the Red de Canjes claim commission as paid
        await admin
          .from('red_canjes_claims')
          .update({ commission_paid: true, commission_paid_at: new Date().toISOString() })
          .eq('id', claimId)
      } else if (type === 'other_service' && paymentId) {
        // Mark the other service payment as paid
        await admin
          .from('other_service_payments')
          .update({ paid: true })
          .eq('id', paymentId)
      } else if (appId && payer) {
        // Commission payment
        const field =
          payer === 'applicant'
            ? 'commission_paid_applicant'
            : 'commission_paid_owner'
        await admin
          .from('applications')
          .update({ [field]: true })
          .eq('id', appId)
      }
    } catch {
      // Webhook will handle it as fallback
    }
  }

  // Redirect destination
  if (type === 'red_canjes') {
    const redirectParam =
      status === 'success'
        ? `?commission_paid=true`
        : status === 'failure'
        ? `?payment_failed=true`
        : `?payment_pending=true`
    return NextResponse.redirect(`${siteUrl}/dashboard/red-canjes${redirectParam}`)
  }

  const redirectParam =
    status === 'success'
      ? type === 'other_service'
        ? `?other_service_paid=true`
        : `?commission_paid=true`
      : status === 'failure'
      ? `?payment_failed=true`
      : `?payment_pending=true`

  return NextResponse.redirect(
    `${siteUrl}/dashboard/postulaciones${redirectParam}`
  )
}
