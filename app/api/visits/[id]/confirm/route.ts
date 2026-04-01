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

  // 2. Get visit_number (may be null for older visits without number)
  const visitNumber: number = (visit as any).visit_number ?? 0

  // 3. Parse visitor info from notes
  const visitor = parseVisitorFromNotes(visit.notes)
  const property = (visit as any).property

  // 4. Get the agent assigned to the property (property.agent_id)
  //    Fall back to the logged-in manager if no agent is assigned
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
    agentEmail = '' // profile auth email not needed as fallback
  }

  // 5. Format visit date
  const visitDate = new Date(scheduled_at).toLocaleDateString('es-CL', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  // 6. Generate PDF
  const pdfBuffer = await generateVisitPdf({
    visitNumber,
    propertyAddress: property?.address || property?.title || '',
    propertyCity: property?.city || '',
    propertyOperation: property?.operation || '',
    propertyCode: property?.id ? property.id.substring(0, 8).toUpperCase() : '',
    propertyUrl: `${siteUrl}/propiedades/${property?.id || ''}`,
    visitorName: visitor.name,
    visitorRut: visitor.rut,
    visitorPhone: visitor.phone,
    visitorEmail: visitor.email,
    visitDate,
    agentName: agentProfile?.full_name || profile.full_name || 'Agente Altaprop',
    agentPhone: agentProfile?.phone || '',
    agentEmail,
    agentCompany: 'Alta Prop Gestión Inmobiliaria',
    observation: visitor.observation,
  })

  // 7. Send email to visitor (only if we have their email)
  const resendKey = process.env.RESEND_API_KEY
  if (resendKey && visitor.email) {
    const isRent = property?.operation === 'arriendo'
    const emailHtml = buildVisitConfirmEmail(
      visitor.name,
      property?.title || property?.address || 'la propiedad',
      visitDate,
      agentProfile?.full_name || profile.full_name || 'Agente Altaprop',
      agentEmail,
      agentProfile?.phone || '',
      `${siteUrl}/propiedades/${property?.id || ''}`,
      visitNumber,
    )

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Altaprop <noreply@altaprop-app.cl>',
        to: visitor.email,
        subject: `📅 Visita Confirmada — ${property?.title || 'Propiedad'} | Orden N° ${visitNumber}`,
        html: emailHtml,
        attachments: [
          {
            filename: `orden-visita-${visitNumber}.pdf`,
            content: pdfBuffer.toString('base64'),
          }
        ],
      }),
    }).catch(() => {}) // non-blocking
  }

  return NextResponse.json({ success: true, visitNumber })
}

// ── Confirmation email HTML ────────────────────────────────────────────────────
function buildVisitConfirmEmail(
  visitorName: string,
  propertyTitle: string,
  visitDate: string,
  agentName: string,
  agentEmail: string,
  agentPhone: string,
  propertyUrl: string,
  visitNumber: number,
): string {
  return `
<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:600px;margin:32px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

  <div style="background:#1a2332;padding:28px 40px;display:flex;align-items:center;justify-content:space-between;">
    <div>
      <h1 style="color:#c9a84c;margin:0;font-size:26px;font-weight:800;letter-spacing:2px;">ALTAPROP</h1>
      <p style="color:#6b7f96;margin:4px 0 0;font-size:12px;letter-spacing:1px;text-transform:uppercase;">Gestión Inmobiliaria</p>
    </div>
    <div style="background:#c9a84c;padding:8px 18px;border-radius:8px;text-align:center;">
      <p style="margin:0;font-size:9px;font-weight:700;color:#1a2332;text-transform:uppercase;letter-spacing:0.5px;">Orden de Visita</p>
      <p style="margin:0;font-size:20px;font-weight:800;color:#1a2332;">N° ${visitNumber}</p>
    </div>
  </div>

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
        <tr>
          <td style="padding:5px 0;color:#166534;font-size:14px;width:140px;">Propiedad</td>
          <td style="padding:5px 0;color:#1a2332;font-size:14px;font-weight:600;">${propertyTitle}</td>
        </tr>
        <tr>
          <td style="padding:5px 0;color:#166534;font-size:14px;">Fecha y hora</td>
          <td style="padding:5px 0;color:#1a2332;font-size:14px;font-weight:600;">📅 ${visitDate}</td>
        </tr>
        <tr>
          <td style="padding:5px 0;color:#166534;font-size:14px;">Agente</td>
          <td style="padding:5px 0;color:#1a2332;font-size:14px;font-weight:600;">👤 ${agentName}</td>
        </tr>
        ${agentPhone ? `<tr>
          <td style="padding:5px 0;color:#166534;font-size:14px;">Teléfono agente</td>
          <td style="padding:5px 0;color:#1a2332;font-size:14px;font-weight:600;">📞 ${agentPhone}</td>
        </tr>` : ''}
        ${agentEmail ? `<tr>
          <td style="padding:5px 0;color:#166534;font-size:14px;">Email agente</td>
          <td style="padding:5px 0;color:#1a2332;font-size:14px;font-weight:600;">✉️ ${agentEmail}</td>
        </tr>` : ''}
      </table>
    </div>

    <div style="background:#fffbeb;border:1px solid #fde68a;border-left:4px solid #c9a84c;border-radius:10px;padding:16px 20px;margin:0 0 24px;">
      <p style="margin:0;font-size:13px;color:#78350f;line-height:1.6;">
        📎 Adjunto encontrarás la <strong>Orden de Visita N° ${visitNumber}</strong> en formato PDF.<br>
        Preséntala al momento de la visita y consérvala para tus registros.
      </p>
    </div>

    <div style="text-align:center;margin:0 0 28px;">
      <a href="${propertyUrl}" style="background:#1a2332;color:#c9a84c;padding:14px 36px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block;">
        Ver Propiedad →
      </a>
    </div>

    <p style="color:#64748b;font-size:14px;line-height:1.6;text-align:center;margin:0;">
      ¡Te esperamos en la visita!<br>
      <strong style="color:#1a2332;">El equipo de Altaprop</strong>
    </p>
  </div>

  <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 40px;text-align:center;">
    <p style="color:#94a3b8;font-size:12px;margin:0;">
      <a href="https://altaprop-app.cl" style="color:#94a3b8;text-decoration:none;">altaprop-app.cl</a>
    </p>
  </div>
</div>
</body></html>`
}
