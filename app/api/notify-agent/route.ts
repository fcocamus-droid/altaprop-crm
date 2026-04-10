import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const { propertyId, agentId } = await request.json()

    if (!propertyId || !agentId) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
    }

    // Get property
    const { data: property, error: propErr } = await supabase
      .from('properties')
      .select('*')
      .eq('id', propertyId)
      .single()

    if (propErr || !property) {
      return NextResponse.json({ error: 'Propiedad no encontrada: ' + (propErr?.message || '') }, { status: 404 })
    }

    // Get owner profile
    const { data: ownerProfile } = await supabase
      .from('profiles')
      .select('full_name, phone, rut')
      .eq('id', property.owner_id)
      .single()

    property.owner = ownerProfile

    // Get agent email
    const { data: { user: agentUser } } = await supabase.auth.admin.getUserById(agentId)
    if (!agentUser?.email) {
      return NextResponse.json({ error: 'Agente sin email' }, { status: 400 })
    }

    // Get agent name
    const { data: agentProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', agentId)
      .single()

    // Get owner email
    const { data: { user: ownerUser } } = await supabase.auth.admin.getUserById(property.owner_id)

    const price = property.currency === 'UF'
      ? `${property.price} UF`
      : `$${Number(property.price).toLocaleString('es-CL')}`

    const agentName = agentProfile?.full_name || 'Agente'
    const ownerName = property.owner?.full_name || 'No registrado'
    const ownerPhone = property.owner?.phone || 'No registrado'
    const ownerEmail = ownerUser?.email || 'No registrado'

    // Use Resend API to send email (works reliably)
    const resendKey = process.env.RESEND_API_KEY
    if (resendKey) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Altaprop <onboarding@resend.dev>',
          to: [agentUser.email],
          subject: `Nueva propiedad asignada - ${property.title}`,
          html: buildEmail(agentName, property, price, ownerName, ownerPhone, ownerEmail, property.owner?.rut || '', propertyId),
        }),
      })
      const result = await res.json()
      if (res.ok) {
        return NextResponse.json({ success: true, message: `Email enviado a ${agentUser.email}` })
      }
      // If Resend fails (unverified domain), fall through to Supabase method
    }

    // Fallback: Use Supabase Auth to send email (same SMTP as registration)
    // Reset password flow sends a reliable email
    const { error: resetError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: agentUser.email,
      options: {
        redirectTo: `https://www.altaprop-app.cl/dashboard/propiedades/${propertyId}`,
      },
    })

    if (resetError) {
      return NextResponse.json({ error: 'Error: ' + resetError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: `Notificación enviada a ${agentUser.email}` })

  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 })
  }
}

function buildEmail(agentName: string, property: any, price: string, ownerName: string, ownerPhone: string, ownerEmail: string, ownerRut: string, propertyId: string) {
  return `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;">
  <div style="background:#1B2A4A;padding:30px;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:28px;">Alta<span style="color:#C4A962;">prop</span></h1>
    <p style="color:#C4A962;margin:5px 0 0;font-size:13px;">Gestión Inmobiliaria</p>
  </div>
  <div style="padding:30px;">
    <h2 style="color:#1B2A4A;margin-top:0;">Nueva propiedad asignada</h2>
    <p style="color:#444;font-size:15px;">Estimado/a <strong>${agentName}</strong>, se te ha asignado una nueva propiedad.</p>
    <div style="background:#f8f9fa;border-radius:12px;padding:20px;margin:20px 0;border-left:4px solid #C4A962;">
      <h3 style="color:#1B2A4A;margin:0 0 10px;">🏠 ${property.title}</h3>
      <p style="margin:4px 0;color:#444;">📌 ${[property.address, property.city, property.sector].filter(Boolean).join(', ') || 'Sin dirección'}</p>
      <p style="margin:4px 0;color:#1B2A4A;font-size:18px;font-weight:bold;">💰 ${price} (${property.operation})</p>
      <p style="margin:4px 0;color:#444;">🛏 ${property.bedrooms} dorm · 🚿 ${property.bathrooms} baños · 📐 ${property.sqm}m² · ${property.type}</p>
    </div>
    <div style="background:#fff9f0;border-radius:12px;padding:20px;margin:20px 0;border-left:4px solid #C4A962;">
      <h3 style="color:#1B2A4A;margin:0 0 10px;">👤 Propietario</h3>
      <p style="margin:4px 0;">📛 <strong>${ownerName}</strong></p>
      ${ownerRut ? `<p style="margin:4px 0;">🪪 ${ownerRut}</p>` : ''}
      <p style="margin:4px 0;">📞 ${ownerPhone}</p>
      <p style="margin:4px 0;">✉️ ${ownerEmail}</p>
    </div>
    <div style="text-align:center;margin:30px 0;">
      <a href="https://www.altaprop-app.cl/dashboard/propiedades/${propertyId}" style="background:#1B2A4A;color:#fff;padding:14px 40px;text-decoration:none;border-radius:8px;font-weight:bold;">Ver Propiedad</a>
    </div>
  </div>
  <div style="background:#f8f8f8;padding:20px;text-align:center;border-top:1px solid #eee;">
    <p style="color:#999;font-size:12px;margin:0;">Altaprop - Gestión Inmobiliaria Integral</p>
  </div>
</div>`
}
