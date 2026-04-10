import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { findOrCreatePostulante } from '@/lib/actions/guest-profile'
import { fetchSubscriberBrand, buildSimpleBrandHeader, type SubscriberBrand } from '@/lib/utils/subscriber-brand'

export async function POST(req: NextRequest) {
  try {
    const { propertyId, fullName, rut, email, phone, message } = await req.json()

    if (!propertyId || !fullName || !email) {
      return NextResponse.json({ error: 'Nombre y email son obligatorios' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Property fetch and visitor creation are independent — run in parallel
    const [{ data: property }, applicantId] = await Promise.all([
      admin.from('properties').select('id, title, address, subscriber_id').eq('id', propertyId).single(),
      findOrCreatePostulante(email, fullName, phone ?? null, rut ?? null),
    ])

    if (!property) return NextResponse.json({ error: 'Propiedad no encontrada' }, { status: 404 })

    // Duplicate guard — same applicant + same property
    const { data: existing } = await admin
      .from('applications')
      .select('id')
      .eq('property_id', propertyId)
      .eq('applicant_id', applicantId)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'Ya tienes una postulación activa para esta propiedad' }, { status: 409 })
    }

    const { error } = await admin.from('applications').insert({
      property_id:   propertyId,
      applicant_id:  applicantId,
      subscriber_id: property.subscriber_id,
      status:        'pending',
      // phone and rut are already persisted on the applicant's profile row
      message:       message || null,
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://altaprop-app.cl'

    // Fire-and-forget — don't block the response
    sendNotificationEmails({
      admin,
      subscriberId: property.subscriber_id,
      propertyTitle: property.title || property.address || 'la propiedad',
      applicantName: fullName,
      applicantEmail: email,
      siteUrl,
    }).catch(err => console.error('apply notification emails error:', err))

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('public/apply error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// ── Email helpers ─────────────────────────────────────────────────────────────

interface EmailPayload {
  admin: ReturnType<typeof createAdminClient>
  subscriberId: string
  propertyTitle: string
  applicantName: string
  applicantEmail: string
  siteUrl: string
}

async function sendNotificationEmails(p: EmailPayload) {
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) return

  const brand = await fetchSubscriberBrand(p.subscriberId, p.admin, p.siteUrl)
  const from  = `${brand.name} <noreply@altaprop-app.cl>`

  const send = (to: string, subject: string, html: string) =>
    fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to, subject, html }),
    }).catch(() => {})

  await Promise.all([
    // Acknowledgment to applicant
    send(
      p.applicantEmail,
      `Postulación recibida — ${p.propertyTitle}`,
      buildApplicantAckEmail(p.applicantName, p.propertyTitle, brand),
    ),
    // Notification to subscriber
    brand.email ? send(
      brand.email,
      `Nueva postulación — ${p.propertyTitle}`,
      buildSubscriberNotifEmail(p.applicantName, p.applicantEmail, p.propertyTitle, brand),
    ) : Promise.resolve(),
  ])
}

function buildApplicantAckEmail(
  applicantName: string,
  propertyTitle: string,
  brand: SubscriberBrand,
): string {
  return `
<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:580px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
  ${buildSimpleBrandHeader(brand)}

  <div style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);border-bottom:3px solid #22c55e;padding:28px 40px;text-align:center;">
    <div style="font-size:48px;margin-bottom:12px;">✅</div>
    <h2 style="color:#14532d;margin:0;font-size:22px;font-weight:700;">¡Postulación Recibida!</h2>
    <p style="color:#15803d;margin:8px 0 0;font-size:14px;">Hemos registrado tu postulación exitosamente</p>
  </div>

  <div style="padding:36px 40px;">
    <p style="color:#1a2332;font-size:16px;margin:0 0 8px;">Estimado/a <strong>${applicantName}</strong>,</p>
    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 24px;">
      Tu postulación para la propiedad <strong style="color:#1a2332;">"${propertyTitle}"</strong> ha sido
      recibida. Nuestro equipo la revisará y se pondrá en contacto contigo a la brevedad.
    </p>

    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-left:4px solid #22c55e;border-radius:10px;padding:20px 24px;margin:0 0 24px;">
      <p style="margin:0 0 10px;font-size:11px;color:#166534;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">¿Qué sigue?</p>
      <ul style="margin:0;padding-left:18px;color:#374151;font-size:14px;line-height:1.8;">
        <li>Un agente de <strong>${brand.name}</strong> revisará tu postulación</li>
        <li>Recibirás un correo cuando tu postulación sea aprobada o rechazada</li>
        <li>Si tienes dudas, puedes responder este correo directamente</li>
      </ul>
    </div>

    <div style="background:#fffbeb;border:1px solid #fde68a;border-left:4px solid #c9a84c;border-radius:10px;padding:16px 20px;">
      <p style="margin:0;font-size:13px;color:#78350f;line-height:1.6;">
        ℹ️ Tu información es confidencial y solo será compartida con el agente responsable de la propiedad.
      </p>
    </div>
  </div>

  <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 40px;text-align:center;">
    <p style="color:#94a3b8;font-size:12px;margin:0;"><a href="${brand.siteUrl}" style="color:#94a3b8;text-decoration:none;">${brand.website}</a></p>
  </div>
</div>
</body></html>`
}

function buildSubscriberNotifEmail(
  applicantName: string,
  applicantEmail: string,
  propertyTitle: string,
  brand: SubscriberBrand,
): string {
  return `
<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:580px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
  ${buildSimpleBrandHeader(brand)}

  <div style="background:linear-gradient(135deg,#fefce8,#fef9c3);border-bottom:3px solid #c9a84c;padding:24px 36px;">
    <div style="display:flex;align-items:center;gap:16px;">
      <div style="font-size:40px;">📋</div>
      <div>
        <h2 style="color:#1a2332;margin:0;font-size:19px;font-weight:700;">Nueva Postulación Recibida</h2>
        <p style="color:#78350f;margin:6px 0 0;font-size:13px;">Un interesado ha postulado a una de tus propiedades</p>
      </div>
    </div>
  </div>

  <div style="padding:32px 36px;">
    <div style="margin:0 0 20px;">
      <div style="background:#e8eef6;padding:8px 14px;border-radius:6px 6px 0 0;border-left:3px solid #c9a84c;">
        <p style="margin:0;font-size:10px;font-weight:700;color:#1e3a5f;text-transform:uppercase;letter-spacing:1px;">👤 Datos del postulante</p>
      </div>
      <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-top:none;">
        <tr style="background:#f8fafc;"><td style="padding:8px 14px;color:#64748b;font-size:13px;width:130px;border-bottom:1px solid #f1f5f9;">Nombre</td><td style="padding:8px 14px;color:#1a2332;font-size:13px;font-weight:600;border-bottom:1px solid #f1f5f9;">${applicantName}</td></tr>
        <tr><td style="padding:8px 14px;color:#64748b;font-size:13px;">Email</td><td style="padding:8px 14px;color:#1a2332;font-size:13px;font-weight:600;">${applicantEmail}</td></tr>
      </table>
    </div>

    <div style="margin:0 0 24px;">
      <div style="background:#e8eef6;padding:8px 14px;border-radius:6px 6px 0 0;border-left:3px solid #c9a84c;">
        <p style="margin:0;font-size:10px;font-weight:700;color:#1e3a5f;text-transform:uppercase;letter-spacing:1px;">🏠 Propiedad</p>
      </div>
      <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-top:none;">
        <tr style="background:#f8fafc;"><td style="padding:8px 14px;color:#64748b;font-size:13px;width:130px;">Propiedad</td><td style="padding:8px 14px;color:#1a2332;font-size:13px;font-weight:600;">${propertyTitle}</td></tr>
      </table>
    </div>

    <div style="text-align:center;">
      <a href="${brand.siteUrl}/dashboard/postulaciones" style="background:#c9a84c;color:#1a2332;padding:13px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px;display:inline-block;">Ver en Panel de Postulaciones →</a>
    </div>
  </div>

  <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 36px;text-align:center;">
    <p style="color:#94a3b8;font-size:11px;margin:0;">Correo de uso interno — <a href="${brand.siteUrl}" style="color:#94a3b8;text-decoration:none;">${brand.website}</a></p>
  </div>
</div>
</body></html>`
}
