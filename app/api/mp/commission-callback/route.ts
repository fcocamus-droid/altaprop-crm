import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const appId = searchParams.get('app_id')
  const payer = searchParams.get('payer')
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.altaprop-app.cl'

  if (status === 'success' && appId && payer) {
    try {
      const admin = createAdminClient()
      const field =
        payer === 'applicant'
          ? 'commission_paid_applicant'
          : 'commission_paid_owner'

      await admin
        .from('applications')
        .update({ [field]: true })
        .eq('id', appId)
    } catch {
      // Webhook will handle it as fallback
    }
  }

  const redirectParam =
    status === 'success'
      ? `?commission_paid=true`
      : status === 'failure'
      ? `?commission_paid=failed`
      : `?commission_paid=pending`

  return NextResponse.redirect(
    `${siteUrl}/dashboard/postulaciones${redirectParam}`
  )
}
