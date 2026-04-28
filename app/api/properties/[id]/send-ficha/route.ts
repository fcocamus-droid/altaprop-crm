import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getUserProfile } from '@/lib/auth'
import { isPropertyManager } from '@/lib/constants'
import { buildPropertyFichaEmail } from '@/lib/emails/property-ficha-email'
import { generatePropertyPDF } from '@/lib/generate-property-pdf'
import { fetchSubscriberBrand } from '@/lib/utils/subscriber-brand'

export const dynamic = 'force-dynamic'

async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
    if (!res.ok) return null
    const buffer = await res.arrayBuffer()
    return Buffer.from(buffer).toString('base64')
  } catch {
    return null
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const profile = await getUserProfile()
  if (!profile || !isPropertyManager(profile.role)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { recipientEmail, recipientName } = await req.json()
  if (!recipientEmail || typeof recipientEmail !== 'string') {
    return NextResponse.json({ error: 'Email destinatario requerido' }, { status: 400 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  if (!url || !key) return NextResponse.json({ error: 'Config error' }, { status: 500 })

  const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

  // ── Fetch full property ────────────────────────────────────────────────────
  const { data: property, error: propErr } = await admin
    .from('properties')
    .select(`
      id, title, description, type, operation, price, currency,
      address, address2, city, sector, region, zip_code,
      bedrooms, bathrooms, half_bathrooms,
      sqm, covered_sqm, terrace_sqm,
      parking, storage, floor_level, floor_count,
      year_built, condition, style, furnished, pets_allowed, exclusive,
      common_expenses, contribuciones,
      amenities, video_url, virtual_tour_url,
      owner_id, agent_id, subscriber_id,
      property_images(url, order)
    `)
    .eq('id', params.id)
    .single()

  if (propErr || !property) {
    return NextResponse.json({ error: 'Propiedad no encontrada' }, { status: 404 })
  }

  // Authorization: only owner, assigned agent, or admin
  const isOwner = property.owner_id === profile.id || property.agent_id === profile.id
  if (!isOwner && profile.role !== 'SUPERADMIN' && profile.role !== 'SUPERADMINBOSS') {
    return NextResponse.json({ error: 'Sin acceso a esta propiedad' }, { status: 403 })
  }

  // Sort images by order
  const sortedImages = ((property.property_images as any[]) || [])
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((img: any) => img.url as string)

  // ── Fetch subscriber brand ─────────────────────────────────────────────────
  const subscriberId = property.subscriber_id || profile.subscriber_id || profile.id
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://altaprop-app.cl'
  const brand = await fetchSubscriberBrand(subscriberId, admin, siteUrl)

  // ── Fetch agent info ───────────────────────────────────────────────────────
  let agentName  = profile.full_name || 'Agente'
  let agentPhone = profile.phone || ''
  let agentEmail = ''

  const agentId = property.agent_id || profile.id
  try {
    const { data: agentAuth } = await admin.auth.admin.getUserById(agentId)
    agentEmail = agentAuth?.user?.email || brand.email || ''
    const { data: agentProfile } = await admin.from('profiles').select('full_name, phone').eq('id', agentId).single()
    if (agentProfile) {
      agentName  = agentProfile.full_name  || agentName
      agentPhone = agentProfile.phone || agentPhone
    }
  } catch {}

  const agent = { name: agentName, phone: agentPhone, email: agentEmail }

  // ── Generate PDF (fetch images + logo in parallel) ────────────────────────
  // Was a sequential for-await loop; moved to Promise.all so PDF generation
  // doesn't block on each thumbnail one at a time.
  const imgLimit = Math.min(sortedImages.length, 6)
  const [imageResults, logoBase64] = await Promise.all([
    Promise.all(sortedImages.slice(0, imgLimit).map(src => fetchImageAsBase64(src))),
    brand.logoUrl ? fetchImageAsBase64(brand.logoUrl) : Promise.resolve(null),
  ])
  const imageBase64s = imageResults.filter((b): b is string => !!b)

  let pdfBuffer: Buffer | null = null
  try {
    pdfBuffer = generatePropertyPDF({
      property,
      images: imageBase64s,
      agent,
      brand: { name: brand.name, logoBase64, phone: brand.phone, email: brand.email },
    })
  } catch (e: any) {
    console.error('PDF generation error:', e?.message)
  }

  // ── Build email HTML ───────────────────────────────────────────────────────
  const imagesForEmail = sortedImages.slice(0, 6).map(url => ({ url }))
  const { subject, html } = buildPropertyFichaEmail({
    property: { ...property, images: imagesForEmail },
    agent,
    recipientName: recipientName?.trim() || undefined,
    brand,
  })

  // ── Send via Resend ────────────────────────────────────────────────────────
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) return NextResponse.json({ error: 'Resend no configurado' }, { status: 500 })

  const emailPayload: any = {
    from: `${brand.name} <propiedades@altaprop-app.cl>`,
    to: [recipientEmail.trim()],
    subject,
    html,
  }

  if (pdfBuffer) {
    emailPayload.attachments = [{
      filename: `Ficha-${property.title.replace(/[^a-zA-Z0-9]/g, '-').slice(0, 40)}.pdf`,
      content: pdfBuffer.toString('base64'),
    }]
  }

  const resendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(emailPayload),
  })

  if (!resendRes.ok) {
    const err = await resendRes.text()
    console.error('Resend error:', err)
    return NextResponse.json({ error: 'Error enviando el correo. Intenta de nuevo.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
