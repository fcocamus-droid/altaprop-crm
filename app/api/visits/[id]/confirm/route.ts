export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getUserProfile } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { isPropertyManager } from '@/lib/constants'
import { generateVisitPdf, parseVisitorFromNotes } from '@/lib/utils/visit-pdf'

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const profile = await getUserProfile()
  if (!profile || !isPropertyManager(profile.role)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { scheduled_at } = await req.json()
  if (!scheduled_at) {
    return NextResponse.json({ error: 'scheduled_at requerido' }, { status: 400 })
  }

  const admin = createAdminClient()
  const visitId = params.id
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://altaprop-app.cl'

  // 1. Update visit to confirmed
  const { data: visit, error: updateErr } = await admin
    .from('visits')
    .update({ scheduled_at, status: 'confirmed' })
    .eq('id', visitId)
    .select('*, property:properties(id, title, address, city, operation, agent_id)')
    .single()

  if (updateErr || !visit) {
    return NextResponse.json({ error: updateErr?.message || 'Visita no encontrada' }, { status: 500 })
  }

  // 2. Get visit_number
  const visitNumber: number = (visit as any).visit_number ?? 0

  // 3. Parse visitor info from notes
  const visitor = parseVisitorFromNotes(visit.notes)
  const property = (visit as any).property

  // 4. Get the agent assigned to the property (property.agent_id)
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
    // Fallback: use the manager who is confirming the visit
    agentProfile = { full_name: profile.full_name || 'Agente Altaprop', phone: (profile as any).phone || '' }
  }

  // 5. Get SUPERADMIN email + branding via visit.subscriber_id
  //    subscriber_id on a visit points to the SUPERADMIN who owns the org
  const subscriberId: string | null = (visit as any).subscriber_id || null
  let superadminEmail = ''
  let subscriberBrand = {
    name: 'Altaprop',
    displayName: 'ALTAPROP',
    logoUrl: '',
    phone: '',
    email: '',
    siteUrl: 'https://altaprop-app.cl',
    website: 'altaprop-app.cl',
  }

  if (subscriberId) {
    try {
      const { data: authSuperadmin } = await admin.auth.admin.getUserById(subscriberId)
      superadminEmail = authSuperadmin?.user?.email || ''
    } catch {}

    // Fetch subscriber profile for branding
    const { data: subProfile } = await admin
      .from('profiles')
      .select('full_name, avatar_url, phone')
      .eq('id', subscriberId)
      .single()

    if (subProfile?.full_name) {
      subscriberBrand = {
        name: subProfile.full_name,
        displayName: subProfile.full_name.toUpperCase(),
        logoUrl: subProfile.avatar_url || '',
        phone: subProfile.phone || '',
        email: superadminEmail,
        siteUrl: siteUrl,
        website: siteUrl.replace(/^https?:\/\//, ''),
      }
    }
  }

  // 6. Format visit date (always in Chile timezone, 24h)
  const visitDate = new Date(scheduled_at).toLocaleDateString('es-CL', {
    timeZone: 'America/Santiago',
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
    hourCycle: 'h23',
  })

  const agentName = agentProfile?.full_name || profile.full_name || 'Agente Altaprop'
  const agentPhone = agentProfile?.phone || ''
  const propertyTitle = property?.title || property?.address || 'la propiedad'
  const propertyUrl = `${siteUrl}/propiedades/${property?.id || ''}`
  const dashboardUrl = `${siteUrl}/dashboard/visitas`
  const pdfFilename = `orden-visita-${visitNumber}.pdf`

  // 7. Generate PDF
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

  const pdfAttachment = {
    filename: pdfFilename,
    content: pdfBuffer.toString('base64'),
  }

  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    return NextResponse.json({ success: true, visitNumber })
  }

  // reply_to uses subscriber email so visitors/agents reply directly to the agency
  const replyTo = subscriberBrand.email || undefined

  const sendEmail = (to: string, subject: string, html: string) =>
    fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Altaprop <noreply@altaprop-app.cl>',
        to,
        subject,
        html,
        ...(replyTo ? { reply_to: replyTo } : {}),
        attachments: [pdfAttachment],
      }),
    }).catch(() => {})

  // 8. Email to VISITOR
  if (visitor.email) {
    const html = buildVisitorEmail(visitor.name, propertyTitle, visitDate, agentName, agentEmail, agentPhone, propertyUrl, visitNumber, subscriberBrand)
    await sendEmail(
      visitor.email,
      `📅 Visita Confirmada — ${propertyTitle} | Orden N° ${visitNumber}`,
      html,
    )
  }

  // 9. Email to AGENT (if has email and is different from superadmin)
  if (agentEmail && agentEmail !== superadminEmail) {
    const html = buildInternalEmail(
      agentName,
      'Agente',
      visitor,
      propertyTitle,
      property,
      visitDate,
      agentName,
      agentEmail,
      agentPhone,
      dashboardUrl,
      visitNumber,
      subscriberBrand,
    )
    await sendEmail(
      agentEmail,
      `📋 Nueva Orden de Visita N° ${visitNumber} — ${propertyTitle}`,
      html,
    )
  }

  // 10. Email to SUPERADMIN
  if (superadminEmail) {
    const html = buildInternalEmail(
      subscriberBrand.name,
      'Super Admin',
      visitor,
      propertyTitle,
      property,
      visitDate,
      agentName,
      agentEmail,
      agentPhone,
      dashboardUrl,
      visitNumber,
      subscriberBrand,
    )
    await sendEmail(
      superadminEmail,
      `📋 Nueva Orden de Visita N° ${visitNumber} — ${propertyTitle}`,
      html,
    )
  }

  return NextResponse.json({ success: true, visitNumber })
}

// ── Subscriber brand type ─────────────────────────────────────────────────────
interface SubscriberBrand {
  name: string
  displayName: string
  logoUrl: string
  phone: string
  email: string
  siteUrl: string
  website: string
}

// ── Brand header HTML (used in both email types) ──────────────────────────────
function buildBrandHeader(brand: SubscriberBrand, visitNumber: number): string {
  const logoHtml = brand.logoUrl
    ? `<img src="${brand.logoUrl}" alt="${brand.name}" style="max-height:48px;max-width:160px;object-fit:contain;display:block;" />`
    : `<h1 style="color:#c9a84c;margin:0;font-size:24px;font-weight:800;letter-spacing:2px;">${brand.displayName}</h1>
       <p style="color:#6b7f96;margin:4px 0 0;font-size:11px;letter-spacing:1px;text-transform:uppercase;">Gestión Inmobiliaria</p>`
  return `
  <div style="background:#1a2332;padding:24px 40px;display:flex;align-items:center;justify-content:space-between;">
    <div>${logoHtml}</div>
    <div style="background:#c9a84c;padding:8px 18px;border-radius:8px;text-align:center;">
      <p style="margin:0;font-size:9px;font-weight:700;color:#1a2332;text-transform:uppercase;letter-spacing:0.5px;">Orden de Visita</p>
      <p style="margin:0;font-size:20px;font-weight:800;color:#1a2332;">N° ${visitNumber}</p>
    </div>
  </div>`
}

// ── Visitor confirmation email ────────────────────────────────────────────────
function buildVisitorEmail(
  visitorName: string,
  propertyTitle: string,
  visitDate: string,
  agentName: string,
  agentEmail: string,
  agentPhone: string,
  propertyUrl: string,
  visitNumber: number,
  brand: SubscriberBrand,
): string {
  return `
<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:600px;margin:32px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

  ${buildBrandHeader(brand, visitNumber)}

  <div style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);border-bottom:3px solid #22c55e;padding:32px 40px;text-align:center;">
    <div style="font-size:52px;margin-bottom:12px;">📅</div>
    <h2 style="color:#14532d;margin:0;font-size:24px;font-weight:700;">¡Visita Confirmada!</h2>
    <p style="color:#15803d;margin:8px 0 0;font-size:15px;">Tu visita a la propiedad ha sido agendada</p>
  </div>

  <div style="padding:36px 40px;">
    <p style="color:#1a2332;font-size:16px;margin:0 0 8px;">Estimado/a <strong>${visitorName}</strong>,</p>
    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 24px;">
      Tu visita a la propiedad <strong style="color:#1a2332;">"${propertyTitle}"</strong> ha sido
      <strong style="color:#16a34a;">confirmada exitosamente</strong>. Encontrarás adjunto el documento
      <strong>Orden de Visita N° ${visitNumber}</strong> con todos los detalles.
    </p>

    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-left:4px solid #22c55e;border-radius:10px;padding:20px 24px;margin:0 0 24px;">
      <p style="margin:0 0 12px;font-size:11px;color:#166534;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">Detalle de la visita</p>
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:5px 0;color:#166534;font-size:14px;width:140px;">Propiedad</td><td style="padding:5px 0;color:#1a2332;font-size:14px;font-weight:600;">${propertyTitle}</td></tr>
        <tr><td style="padding:5px 0;color:#166534;font-size:14px;">Fecha y hora</td><td style="padding:5px 0;color:#1a2332;font-size:14px;font-weight:600;">📅 ${visitDate}</td></tr>
        <tr><td style="padding:5px 0;color:#166534;font-size:14px;">Agente</td><td style="padding:5px 0;color:#1a2332;font-size:14px;font-weight:600;">👤 ${agentName}</td></tr>
        <tr><td style="padding:5px 0;color:#166534;font-size:14px;">Agencia</td><td style="padding:5px 0;color:#1a2332;font-size:14px;font-weight:600;">🏢 ${brand.name}</td></tr>
        ${(brand.phone || agentPhone) ? `<tr><td style="padding:5px 0;color:#166534;font-size:14px;">Teléfono contacto</td><td style="padding:5px 0;color:#1a2332;font-size:14px;font-weight:600;">📞 ${brand.phone || agentPhone}</td></tr>` : ''}
        ${(brand.email || agentEmail) ? `<tr><td style="padding:5px 0;color:#166534;font-size:14px;">Email contacto</td><td style="padding:5px 0;color:#1a2332;font-size:14px;font-weight:600;">✉️ ${brand.email || agentEmail}</td></tr>` : ''}
      </table>
    </div>

    <div style="background:#fffbeb;border:1px solid #fde68a;border-left:4px solid #c9a84c;border-radius:10px;padding:16px 20px;margin:0 0 24px;">
      <p style="margin:0;font-size:13px;color:#78350f;line-height:1.6;">
        📎 Adjunto encontrarás la <strong>Orden de Visita N° ${visitNumber}</strong> en formato PDF.<br>
        Preséntala al momento de la visita y consérvala para tus registros.
      </p>
    </div>

    <div style="text-align:center;margin:0 0 28px;">
      <a href="${propertyUrl}" style="background:#1a2332;color:#c9a84c;padding:14px 36px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block;">Ver Propiedad →</a>
    </div>
    <p style="color:#64748b;font-size:14px;line-height:1.6;text-align:center;margin:0;">¡Te esperamos en la visita!<br><strong style="color:#1a2332;">El equipo de ${brand.name}</strong></p>
  </div>

  <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 40px;text-align:center;">
    <p style="color:#94a3b8;font-size:12px;margin:0;"><a href="${brand.siteUrl}" style="color:#94a3b8;text-decoration:none;">${brand.website}</a></p>
  </div>
</div>
</body></html>`
}

// ── Internal email for Agent / SuperAdmin ─────────────────────────────────────
function buildInternalEmail(
  recipientName: string,
  recipientRole: string,
  visitor: { name: string; rut: string; phone: string; email: string; observation: string },
  propertyTitle: string,
  property: any,
  visitDate: string,
  agentName: string,
  agentEmail: string,
  agentPhone: string,
  dashboardUrl: string,
  visitNumber: number,
  brand: SubscriberBrand,
): string {
  const operationLabel = property?.operation === 'arriendo' ? 'Arriendo' : property?.operation === 'venta' ? 'Venta' : property?.operation || ''
  return `
<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:620px;margin:32px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

  <!-- Header -->
  ${buildBrandHeader(brand, visitNumber)}

  <!-- Alert band -->
  <div style="background:linear-gradient(135deg,#eff6ff,#dbeafe);border-bottom:3px solid #3b82f6;padding:24px 36px;display:flex;align-items:center;gap:16px;">
    <div style="font-size:44px;">📋</div>
    <div>
      <h2 style="color:#1e3a5f;margin:0;font-size:20px;font-weight:700;">Nueva Orden de Visita Confirmada</h2>
      <p style="color:#1d4ed8;margin:6px 0 0;font-size:14px;">Se ha confirmado una visita en <strong>${brand.name}</strong> — <strong>${recipientRole}</strong></p>
    </div>
  </div>

  <div style="padding:32px 36px;">
    <p style="color:#1a2332;font-size:15px;margin:0 0 20px;">Hola <strong>${recipientName}</strong>, se ha generado la siguiente orden de visita:</p>

    <!-- Property section -->
    <div style="margin:0 0 20px;">
      <div style="background:#1a2332;padding:8px 14px;border-radius:6px 6px 0 0;">
        <p style="margin:0;font-size:10px;font-weight:700;color:#c9a84c;text-transform:uppercase;letter-spacing:1px;">🏠 Datos de la Propiedad</p>
      </div>
      <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 6px 6px;">
        <tr style="background:#f8fafc;"><td style="padding:8px 14px;color:#64748b;font-size:13px;width:150px;border-bottom:1px solid #f1f5f9;">Propiedad</td><td style="padding:8px 14px;color:#1a2332;font-size:13px;font-weight:600;border-bottom:1px solid #f1f5f9;">${propertyTitle}</td></tr>
        <tr><td style="padding:8px 14px;color:#64748b;font-size:13px;border-bottom:1px solid #f1f5f9;">Ciudad</td><td style="padding:8px 14px;color:#1a2332;font-size:13px;font-weight:600;border-bottom:1px solid #f1f5f9;">${property?.city || '—'}</td></tr>
        <tr style="background:#f8fafc;"><td style="padding:8px 14px;color:#64748b;font-size:13px;border-bottom:1px solid #f1f5f9;">Operación</td><td style="padding:8px 14px;color:#1a2332;font-size:13px;font-weight:600;border-bottom:1px solid #f1f5f9;">${operationLabel}</td></tr>
        <tr><td style="padding:8px 14px;color:#64748b;font-size:13px;">Fecha de visita</td><td style="padding:8px 14px;color:#1a2332;font-size:13px;font-weight:600;">📅 ${visitDate}</td></tr>
      </table>
    </div>

    <!-- Visitor section -->
    <div style="margin:0 0 20px;">
      <div style="background:#1a2332;padding:8px 14px;border-radius:6px 6px 0 0;">
        <p style="margin:0;font-size:10px;font-weight:700;color:#c9a84c;text-transform:uppercase;letter-spacing:1px;">👤 Datos del Visitante</p>
      </div>
      <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-top:none;">
        <tr style="background:#f8fafc;"><td style="padding:8px 14px;color:#64748b;font-size:13px;width:150px;border-bottom:1px solid #f1f5f9;">Nombre</td><td style="padding:8px 14px;color:#1a2332;font-size:13px;font-weight:600;border-bottom:1px solid #f1f5f9;">${visitor.name || '—'}</td></tr>
        <tr><td style="padding:8px 14px;color:#64748b;font-size:13px;border-bottom:1px solid #f1f5f9;">RUT</td><td style="padding:8px 14px;color:#1a2332;font-size:13px;font-weight:600;border-bottom:1px solid #f1f5f9;">${visitor.rut || '—'}</td></tr>
        <tr style="background:#f8fafc;"><td style="padding:8px 14px;color:#64748b;font-size:13px;border-bottom:1px solid #f1f5f9;">Teléfono</td><td style="padding:8px 14px;color:#1a2332;font-size:13px;font-weight:600;border-bottom:1px solid #f1f5f9;">${visitor.phone || '—'}</td></tr>
        <tr><td style="padding:8px 14px;color:#64748b;font-size:13px;border-bottom:1px solid #f1f5f9;">Email</td><td style="padding:8px 14px;color:#1a2332;font-size:13px;font-weight:600;border-bottom:1px solid #f1f5f9;">${visitor.email || '—'}</td></tr>
        ${visitor.observation ? `<tr style="background:#f8fafc;"><td style="padding:8px 14px;color:#64748b;font-size:13px;">Observación</td><td style="padding:8px 14px;color:#1a2332;font-size:13px;font-weight:600;">${visitor.observation}</td></tr>` : ''}
      </table>
    </div>

    <!-- Agent section -->
    <div style="margin:0 0 24px;">
      <div style="background:#1a2332;padding:8px 14px;border-radius:6px 6px 0 0;">
        <p style="margin:0;font-size:10px;font-weight:700;color:#c9a84c;text-transform:uppercase;letter-spacing:1px;">🏢 Agente Responsable</p>
      </div>
      <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-top:none;">
        <tr style="background:#f8fafc;"><td style="padding:8px 14px;color:#64748b;font-size:13px;width:150px;border-bottom:1px solid #f1f5f9;">Nombre</td><td style="padding:8px 14px;color:#1a2332;font-size:13px;font-weight:600;border-bottom:1px solid #f1f5f9;">${agentName}</td></tr>
        ${agentPhone ? `<tr><td style="padding:8px 14px;color:#64748b;font-size:13px;border-bottom:1px solid #f1f5f9;">Teléfono</td><td style="padding:8px 14px;color:#1a2332;font-size:13px;font-weight:600;border-bottom:1px solid #f1f5f9;">${agentPhone}</td></tr>` : ''}
        ${agentEmail ? `<tr style="background:#f8fafc;"><td style="padding:8px 14px;color:#64748b;font-size:13px;">Email</td><td style="padding:8px 14px;color:#1a2332;font-size:13px;font-weight:600;">${agentEmail}</td></tr>` : ''}
      </table>
    </div>

    <!-- PDF notice -->
    <div style="background:#fffbeb;border:1px solid #fde68a;border-left:4px solid #c9a84c;border-radius:10px;padding:14px 18px;margin:0 0 24px;">
      <p style="margin:0;font-size:13px;color:#78350f;line-height:1.6;">
        📎 La <strong>Orden de Visita N° ${visitNumber}</strong> en PDF está adjunta a este correo para tus registros.
      </p>
    </div>

    <!-- CTA -->
    <div style="text-align:center;margin:0 0 8px;">
      <a href="${dashboardUrl}" style="background:#1a2332;color:#c9a84c;padding:13px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px;display:inline-block;">Ver en Dashboard →</a>
    </div>
  </div>

  <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 36px;text-align:center;">
    <p style="color:#94a3b8;font-size:11px;margin:0;">Correo de uso interno — <a href="${brand.siteUrl}" style="color:#94a3b8;text-decoration:none;">${brand.website}</a></p>
  </div>
</div>
</body></html>`
}
