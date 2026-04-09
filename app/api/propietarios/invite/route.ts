import { getUserProfile } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchSubscriberBrand } from '@/lib/utils/subscriber-brand'
import { buildSimpleBrandHeader } from '@/lib/utils/subscriber-brand'

export async function POST(request: NextRequest) {
  const profile = await getUserProfile()
  if (!profile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  // Only SUPERADMIN and AGENTE can invite
  if (profile.role !== 'SUPERADMIN' && profile.role !== 'SUPERADMINBOSS' && profile.role !== 'AGENTE') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { email } = await request.json()
  if (!email) return NextResponse.json({ error: 'Email requerido' }, { status: 400 })

  // Build registration link with subscriber_id
  const subscriberId = profile.role === 'SUPERADMIN' ? (profile.subscriber_id || profile.id) : (profile.subscriber_id || profile.id)
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://altaprop-app.cl'
  const registerUrl = `${baseUrl}/registro-propietario?subscriber=${subscriberId || ''}&invited=true`

  // Fetch subscriber branding
  const admin = createAdminClient()
  const brand = await fetchSubscriberBrand(subscriberId, admin, baseUrl)

  // Send email via Resend
  try {
    const resendKey = process.env.RESEND_API_KEY
    if (resendKey) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: `${brand.name} <noreply@altaprop-app.cl>`,
          to: email,
          subject: `Te invitaron a publicar tu propiedad en ${brand.name}`,
          html: `
<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:520px;margin:32px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
  ${buildSimpleBrandHeader(brand)}
  <div style="padding:36px 40px;">
    <h2 style="color:#1a2332;margin:0 0 16px;font-size:22px;font-weight:700;">¡Hola!</h2>
    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 20px;">
      Te invitamos a registrarte en <strong>${brand.name}</strong> para publicar tu propiedad de forma gratuita
      y tener acceso a nuestra plataforma de gestión.
    </p>
    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 28px;">
      Haz clic en el botón para crear tu cuenta:
    </p>
    <div style="text-align:center;margin:0 0 28px;">
      <a href="${registerUrl}" style="background:#c9a84c;color:#1a2332;padding:14px 36px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block;">
        Registrarme como Propietario →
      </a>
    </div>
    <p style="color:#64748b;font-size:13px;line-height:1.6;margin:0;">
      Este enlace te permitirá crear tu cuenta y gestionar tu propiedad desde tu panel personal.
    </p>
  </div>
  <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 40px;text-align:center;">
    <p style="color:#94a3b8;font-size:12px;margin:0;">
      ${brand.name} · <a href="${brand.siteUrl}" style="color:#94a3b8;text-decoration:none;">${brand.website}</a>
    </p>
  </div>
</div>
</body></html>
          `,
        }),
      })
    }

    return NextResponse.json({ success: true, url: registerUrl })
  } catch (e: any) {
    // Even if email fails, return the URL
    return NextResponse.json({ success: true, url: registerUrl, emailError: e.message })
  }
}
