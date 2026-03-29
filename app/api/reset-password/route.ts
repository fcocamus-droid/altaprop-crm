import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  const { email } = await request.json()

  if (!email) {
    return NextResponse.json({ error: 'Email requerido' })
  }

  const admin = createAdminClient()

  // Check if user exists
  const { data: authData } = await admin.auth.admin.listUsers({ perPage: 200 })
  const foundUser = authData?.users?.find(u => u.email === email)

  if (!foundUser) {
    return NextResponse.json({ error: 'No existe una cuenta con este email' })
  }

  // Generate recovery link via admin API (no rate limit)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.altaprop-app.cl'
  const { data, error } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: {
      redirectTo: `${siteUrl}/auth/callback?next=/reset-password`,
    },
  })

  if (error || !data?.properties?.action_link) {
    return NextResponse.json({ error: error?.message || 'Error generando enlace' })
  }

  const recoveryLink = data.properties.action_link

  // Send email via Resend
  const { error: emailError } = await resend.emails.send({
    from: 'Altaprop <noreply@altaprop-app.cl>',
    to: email,
    subject: 'Restablecer tu contrasena - Altaprop',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #003f73; margin: 0;">Alta<span style="color: #ccbd92;">prop</span></h1>
          <p style="color: #666; font-size: 14px;">CRM Inmobiliario</p>
        </div>
        <h2 style="color: #003f73;">Restablecer Contrasena</h2>
        <p>Hola,</p>
        <p>Recibimos una solicitud para restablecer la contrasena de tu cuenta en Altaprop.</p>
        <p>Haz clic en el siguiente boton para crear una nueva contrasena:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${recoveryLink}" style="background-color: #003f73; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
            Restablecer Contrasena
          </a>
        </div>
        <p style="color: #888; font-size: 13px;">Si no solicitaste este cambio, puedes ignorar este email. Tu contrasena actual no sera modificada.</p>
        <p style="color: #888; font-size: 13px;">Este enlace expira en 24 horas.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #aaa; font-size: 12px; text-align: center;">Altaprop - CRM Inmobiliario | www.altaprop-app.cl</p>
      </div>
    `,
  })

  if (emailError) {
    // Fallback: return direct link if email fails
    return NextResponse.json({
      success: true,
      directLink: recoveryLink,
      message: 'email_failed'
    })
  }

  return NextResponse.json({ success: true })
}
