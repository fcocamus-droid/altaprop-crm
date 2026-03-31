import { getUserProfile } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

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
  const subscriberId = profile.role === 'SUPERADMIN' ? (profile.subscriber_id || profile.id) : profile.subscriber_id
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://altaprop-app.cl'
  const registerUrl = `${baseUrl}/registro-propietario?subscriber=${subscriberId || ''}&invited=true`

  // Send email via Resend
  try {
    const resendKey = process.env.RESEND_API_KEY
    if (resendKey) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Altaprop <noreply@altaprop-app.cl>',
          to: email,
          subject: 'Te invitaron a publicar tu propiedad en Altaprop',
          html: `
            <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
              <h2 style="color: #1a2332;">¡Hola!</h2>
              <p>Te invitaron a registrarte en <strong>Altaprop</strong> para publicar tu propiedad de forma gratuita.</p>
              <p>Haz clic en el siguiente botón para crear tu cuenta:</p>
              <div style="text-align: center; margin: 24px 0;">
                <a href="${registerUrl}" style="background: #c9a84c; color: #1a2332; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
                  Registrarme como Propietario
                </a>
              </div>
              <p style="color: #666; font-size: 14px;">Este enlace te permitirá crear una cuenta y gestionar tu propiedad.</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
              <p style="color: #999; font-size: 12px;">Altaprop - CRM Inmobiliario</p>
            </div>
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
