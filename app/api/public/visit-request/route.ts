import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { toChileDatetime } from '@/lib/utils/chile-datetime'
import { findOrCreatePostulante } from '@/lib/actions/guest-profile'
import { fetchSubscriberBrand, buildSimpleBrandHeader, type SubscriberBrand } from '@/lib/utils/subscriber-brand'

export async function POST(req: NextRequest) {
  try {
    const { propertyId, fullName, rut, email, phone, date, time, message } = await req.json()

    if (!propertyId || !fullName || !email || !date || !time) {
      return NextResponse.json({ error: 'Nombre, email, fecha y hora son obligatorios' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Property fetch and visitor creation are independent — run in parallel
    const [{ data: property }, visitorId] = await Promise.all([
      admin.from('properties').select('id, title, address, subscriber_id').eq('id', propertyId).single(),
      findOrCreatePostulante(email, fullName, phone ?? null, rut ?? null),
    ])

    if (!property) return NextResponse.json({ error: 'Propiedad no encontrada' }, { status: 404 })

    const scheduledAt = toChileDatetime(date, time)
    const notes = [
      `Solicitud de: ${fullName}`,
      rut     ? `RUT: ${rut}`    : null,
      `Tel: ${phone || 'no indicado'}`,
      `Email: ${email}`,
      message || null,
    ].filter(Boolean).join(' | ')

    const { error } = await admin.from('visits').insert({
      property_id:   propertyId,
      visitor_id:    visitorId,
      subscriber_id: property.subscriber_id,
      scheduled_at:  scheduledAt,
      status:        'pending',
      notes,
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://altaprop-app.cl'
    const propertyTitle = property.title || property.address || 'la propiedad'

    // Fire-and-forget — don't block the response
    sendNotificationEmails({
      admin,
      subscriberId: property.subscriber_id,
      propertyTitle,
      visitorName: fullName,
      visitorEmail: email,
      date,
      time,
      siteUrl,
    }).catch(err => console.error('visit-request emails error:', err))

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('public/visit-request error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

interface EmailPayload {
  admin: ReturnType<typeof createAdminClient>
  subscriberId: string
  propertyTitle: string
  visitorName: string
  visitorEmail: string
  date: string
  time: string
  siteUrl: string
}

async function sendNotificationEmails(p: EmailPayload) {
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) return

  const brand = await fetchSubscriberBrand(p.subscriberId, p.admin, p.siteUrl)
  const from  = `${brand.name} <noreply@altaprop-app.cl>`

  const formattedDate = new Date(`${p.date}T12:00:00`).toLocaleDateString('es-CL', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  const send = (to: string, subject: string, html: string) =>
    fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to, subject, html }),
    }).catch(() => {})

  await Promise.all([
    // Acknowledgment to visitor
    send(
      p.visitorEmail,
      `Solicitud de visita recibida — ${p.propertyTitle}`,
      buildVisitorAckEmail(p.visitorName, p.propertyTitle, formattedDate, p.time, brand),
    ),
    // Notification to subscriber
    brand.email ? send(
      brand.email,
      `Nueva solicitud de visita — ${p.propertyTitle}`,
      buildSubscriberNotifEmail(p.visitorName, p.visitorEmail, p.propertyTitle, formattedDate, p.time, brand),
    ) : Promise.resolve(),
  ])
}

function buildVisitorAckEmail(
  visitorName: string,
  propertyTitle: string,
  date: string,
  time: string,
  brand: SubscriberBrand,
): string {
  return `
<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:580px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
  ${buildSimpleBrandHeader(brand)}

  <div style="background:linear-gradient(135deg,#eff6ff,#dbeafe);border-bottom:3px solid #3b82f6;padding:28px 40px;text-align:center;">
    <div style="font-size:48px;margin-bottom:12px;">📅</div>
    <h2 style="color:#1e3a5f;margin:0;font-size:22px;font-weight:700;">¡Solicitud Recibida!</h2>
    <p style="color:#1d4ed8;margin:8px 0 0;font-size:14px;">Tu solicitud de visita ha sido recibida exitosamente</p>
  </div>

  <div style="padding:36px 40px;">
    <p style="color:#1a2332;font-size:16px;margin:0 0 8px;">Estimado/a <strong>${visitorName}</strong>,</p>
    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 24px;">
      Hemos recibido tu solicitud de visita para la propiedad <strong style="color:#1a2332;">"${propertyTitle}"</strong>.
      Te contactaremos a la brevedad para <strong>confirmar la fecha y hora</strong>.
    </p>

    <div style="background:#f0f9ff;border:1px solid #bae6fd;border-left:4px solid #3b82f6;border-radius:10px;padding:20px 24px;margin:0 0 24px;">
      <p style="margin:0 0 10px;font-size:11px;color:#1e40af;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">Datos de tu solicitud</p>
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:5px 0;color:#1e40af;font-size:14px;width:130px;">Propiedad</td><td style="padding:5px 0;color:#1a2332;font-size:14px;font-weight:600;">${propertyTitle}</td></tr>
        <tr><td style="padding:5px 0;color:#1e40af;font-size:14px;">Fecha solicitada</td><td style="padding:5px 0;color:#1a2332;font-size:14px;font-weight:600;">📅 ${date}</td></tr>
        <tr><td style="padding:5px 0;color:#1e40af;font-size:14px;">Hora solicitada</td><td style="padding:5px 0;color:#1a2332;font-size:14px;font-weight:600;">🕐 ${time}</td></tr>
      </table>
    </div>

    <div style="background:#fffbeb;border:1px solid #fde68a;border-left:4px solid #c9a84c;border-radius:10px;padding:16px 20px;">
      <p style="margin:0;font-size:13px;color:#78350f;line-height:1.6;">
        ℹ️ Una vez que nuestro equipo confirme la visita, recibirás un correo con la <strong>Orden de Visita oficial</strong> en formato PDF.
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
  visitorName: string,
  visitorEmail: string,
  propertyTitle: string,
  date: string,
  time: string,
  brand: SubscriberBrand,
): string {
  return `
<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:580px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
  ${buildSimpleBrandHeader(brand)}

  <div style="background:linear-gradient(135deg,#fefce8,#fef9c3);border-bottom:3px solid #c9a84c;padding:24px 36px;">
    <div style="display:flex;align-items:center;gap:16px;">
      <div style="font-size:40px;">🔔</div>
      <div>
        <h2 style="color:#1a2332;margin:0;font-size:19px;font-weight:700;">Nueva Solicitud de Visita</h2>
        <p style="color:#78350f;margin:6px 0 0;font-size:13px;">Un visitante ha solicitado conocer una de tus propiedades</p>
      </div>
    </div>
  </div>

  <div style="padding:32px 36px;">
    <div style="margin:0 0 20px;">
      <div style="background:#e8eef6;padding:8px 14px;border-radius:6px 6px 0 0;border-left:3px solid #c9a84c;">
        <p style="margin:0;font-size:10px;font-weight:700;color:#1e3a5f;text-transform:uppercase;letter-spacing:1px;">👤 Datos del visitante</p>
      </div>
      <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-top:none;">
        <tr style="background:#f8fafc;"><td style="padding:8px 14px;color:#64748b;font-size:13px;width:130px;border-bottom:1px solid #f1f5f9;">Nombre</td><td style="padding:8px 14px;color:#1a2332;font-size:13px;font-weight:600;border-bottom:1px solid #f1f5f9;">${visitorName}</td></tr>
        <tr><td style="padding:8px 14px;color:#64748b;font-size:13px;">Email</td><td style="padding:8px 14px;color:#1a2332;font-size:13px;font-weight:600;">${visitorEmail}</td></tr>
      </table>
    </div>

    <div style="margin:0 0 24px;">
      <div style="background:#e8eef6;padding:8px 14px;border-radius:6px 6px 0 0;border-left:3px solid #c9a84c;">
        <p style="margin:0;font-size:10px;font-weight:700;color:#1e3a5f;text-transform:uppercase;letter-spacing:1px;">🏠 Propiedad solicitada</p>
      </div>
      <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-top:none;">
        <tr style="background:#f8fafc;"><td style="padding:8px 14px;color:#64748b;font-size:13px;width:130px;border-bottom:1px solid #f1f5f9;">Propiedad</td><td style="padding:8px 14px;color:#1a2332;font-size:13px;font-weight:600;border-bottom:1px solid #f1f5f9;">${propertyTitle}</td></tr>
        <tr><td style="padding:8px 14px;color:#64748b;font-size:13px;border-bottom:1px solid #f1f5f9;">Fecha solicitada</td><td style="padding:8px 14px;color:#1a2332;font-size:13px;font-weight:600;border-bottom:1px solid #f1f5f9;">📅 ${date}</td></tr>
        <tr style="background:#f8fafc;"><td style="padding:8px 14px;color:#64748b;font-size:13px;">Hora solicitada</td><td style="padding:8px 14px;color:#1a2332;font-size:13px;font-weight:600;">🕐 ${time}</td></tr>
      </table>
    </div>

    <div style="text-align:center;">
      <a href="${brand.siteUrl}/dashboard/visitas" style="background:#c9a84c;color:#1a2332;padding:13px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px;display:inline-block;">Ver en Panel de Visitas →</a>
    </div>
  </div>

  <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 36px;text-align:center;">
    <p style="color:#94a3b8;font-size:11px;margin:0;">Correo de uso interno — <a href="${brand.siteUrl}" style="color:#94a3b8;text-decoration:none;">${brand.website}</a></p>
  </div>
</div>
</body></html>`
}
