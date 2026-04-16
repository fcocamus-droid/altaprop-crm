import { NextRequest, NextResponse } from 'next/server'
import { getUserProfile } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { preferenceClient } from '@/lib/mercadopago'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const profile = await getUserProfile()
  if (!profile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const allowedRoles = ['SUPERADMIN', 'AGENTE', 'SUPERADMINBOSS']
  if (!allowedRoles.includes(profile.role)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { listing_id, propietario_id, amount } = await request.json()

  if (!listing_id && !propietario_id) {
    return NextResponse.json({ error: 'listing_id o propietario_id requerido' }, { status: 400 })
  }
  if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
    return NextResponse.json({ error: 'Monto inválido' }, { status: 400 })
  }

  const admin = createAdminClient()
  const numAmount = Number(amount)

  // Verify there is an active claim owned by the requesting subscriber
  const subscriberId = profile.role === 'SUPERADMINBOSS' ? profile.id : (profile.subscriber_id || profile.id)

  let claimQuery = admin
    .from('red_canjes_claims')
    .select('id, propietario_id, property_id, subscriber_id, claimed_by_name, subscriber_name')
    .eq('status', 'active')
    .eq('subscriber_id', subscriberId)

  if (listing_id) {
    claimQuery = claimQuery.eq('property_id', listing_id)
  } else {
    claimQuery = claimQuery.eq('propietario_id', propietario_id).is('property_id', null)
  }

  const { data: claim } = await claimQuery.maybeSingle()
  if (!claim) {
    return NextResponse.json({ error: 'No tienes una gestión activa para esta propiedad' }, { status: 404 })
  }

  // Fetch property title for display in MP checkout
  let propertyTitle = 'Propiedad en Red de Canjes'
  if (listing_id) {
    const { data: prop } = await admin
      .from('properties')
      .select('title, operation')
      .eq('id', listing_id)
      .single()
    if (prop?.title) propertyTitle = prop.title
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.altaprop-app.cl'

  // external_reference: "red_canjes_commission:{claimId}"
  const externalRef = `red_canjes_commission:${claim.id}`

  const preference = await preferenceClient.create({
    body: {
      items: [
        {
          id: `red-canjes-commission-${claim.id}`,
          title: 'Altaprop - Comisión Red de Canjes',
          description: `Comisión por gestión - ${propertyTitle}`,
          quantity: 1,
          unit_price: numAmount,
          currency_id: 'CLP',
        },
      ],
      payer: {
        email: profile.email || '',
      },
      back_urls: {
        success: `${siteUrl}/api/mp/commission-callback?status=success&type=red_canjes&claim_id=${claim.id}`,
        failure: `${siteUrl}/api/mp/commission-callback?status=failure&type=red_canjes&claim_id=${claim.id}`,
        pending: `${siteUrl}/api/mp/commission-callback?status=pending&type=red_canjes&claim_id=${claim.id}`,
      },
      auto_return: 'approved',
      external_reference: externalRef,
      notification_url: `${siteUrl}/api/mp/webhook`,
    },
  })

  return NextResponse.json({ url: preference.init_point })
}
