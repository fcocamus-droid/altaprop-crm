export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getUserProfile } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { isPropertyManager } from '@/lib/constants'
import { generateVisitPdf, parseVisitorFromNotes } from '@/lib/utils/visit-pdf'

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const profile = await getUserProfile()
  if (!profile || !isPropertyManager(profile.role)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const admin = createAdminClient()
  const visitId = params.id
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://altaprop-app.cl'

  // 1. Fetch visit with related data
  const { data: visit, error } = await admin
    .from('visits')
    .select('*, property:properties(id, title, address, city, operation, agent_id)')
    .eq('id', visitId)
    .single()

  if (error || !visit) {
    return NextResponse.json({ error: 'Visita no encontrada' }, { status: 404 })
  }

  const visitNumber: number = (visit as any).visit_number ?? 0
  const property = (visit as any).property

  // 2. Parse visitor info from notes
  const visitor = parseVisitorFromNotes(visit.notes)

  // Fallback: if notes don't have structured visitor data, try visitor profile
  if (!visitor.name && visit.visitor_id) {
    const { data: visitorProfile } = await admin
      .from('profiles')
      .select('full_name, phone')
      .eq('id', visit.visitor_id)
      .single()
    if (visitorProfile) {
      visitor.name  = visitorProfile.full_name || visitor.name
      visitor.phone = visitor.phone || visitorProfile.phone || ''
    }
  }

  // 3. Get agent info from the property
  const propertyAgentId: string | null = property?.agent_id || null
  let agentProfile: { full_name: string; phone: string } | null = null
  let agentEmail = ''

  if (propertyAgentId) {
    const { data: agentData } = await admin
      .from('profiles')
      .select('full_name, phone')
      .eq('id', propertyAgentId)
      .single()
    agentProfile = agentData || null

    try {
      const { data: authAgent } = await admin.auth.admin.getUserById(propertyAgentId)
      agentEmail = authAgent?.user?.email || ''
    } catch {}
  } else {
    agentProfile = {
      full_name: profile.full_name || 'Agente Altaprop',
      phone: (profile as any).phone || '',
    }
  }

  // 4. Get subscriber branding
  const subscriberId: string | null = (visit as any).subscriber_id || null
  let subscriberBrand = {
    name: 'Altaprop',
    displayName: 'ALTAPROP',
    siteUrl,
    website: 'altaprop-app.cl',
  }

  if (subscriberId) {
    const { data: subProfile } = await admin
      .from('profiles')
      .select('full_name, website_subdomain, website_domain')
      .eq('id', subscriberId)
      .single()

    const subscriberSiteUrl = (subProfile as any)?.website_domain
      ? `https://${(subProfile as any).website_domain}`
      : (subProfile as any)?.website_subdomain
      ? `https://${(subProfile as any).website_subdomain}.altaprop-app.cl`
      : siteUrl

    if (subProfile?.full_name) {
      subscriberBrand = {
        name: subProfile.full_name,
        displayName: subProfile.full_name.toUpperCase(),
        siteUrl: subscriberSiteUrl,
        website: subscriberSiteUrl.replace(/^https?:\/\//, ''),
      }
    }
  }

  // 5. Format visit date
  const visitDate = new Date(visit.scheduled_at).toLocaleDateString('es-CL', {
    timeZone: 'America/Santiago',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })

  const agentName  = agentProfile?.full_name || profile.full_name || 'Agente Altaprop'
  const agentPhone = agentProfile?.phone || ''
  const propertyUrl = `${subscriberBrand.siteUrl}/propiedades/${property?.id || ''}`

  // 6. Generate PDF
  const pdfBuffer = await generateVisitPdf({
    visitNumber,
    propertyAddress: property?.address || property?.title || '',
    propertyCity: property?.city || '',
    propertyOperation: property?.operation || '',
    propertyCode: property?.id ? property.id.substring(0, 8).toUpperCase() : '',
    propertyUrl,
    visitorName: visitor.name,
    visitorRut: visitor.rut,
    visitorPhone: visitor.phone,
    visitorEmail: visitor.email,
    visitDate,
    agentName,
    agentPhone,
    agentEmail,
    agentCompany: subscriberBrand.name,
    companyDisplayName: subscriberBrand.displayName,
    companyWebsite: subscriberBrand.website,
    observation: visitor.observation,
  })

  const filename = `orden-visita-${String(visitNumber).padStart(4, '0')}.pdf`

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(pdfBuffer.length),
    },
  })
}
