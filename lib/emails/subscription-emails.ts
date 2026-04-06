const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.altaprop-app.cl'
const FROM_EMAIL = 'Altaprop <suscripciones@altaprop-app.cl>'

function baseWrapper(content: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Altaprop</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Inter,'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#0a1628 0%,#1a3a5c 100%);padding:28px 40px;">
            <p style="margin:0;font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.5px;">
              Alta<span style="color:#c9a84c;">prop</span>
            </p>
            <p style="margin:4px 0 0;font-size:12px;color:#94a3b8;letter-spacing:1px;text-transform:uppercase;">Gestión Inmobiliaria</p>
          </td>
        </tr>
        <!-- Content -->
        <tr><td style="padding:40px;">${content}</td></tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;padding:24px 40px;border-top:1px solid #e2e8f0;">
            <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">
              Altaprop — Plataforma de Gestión Inmobiliaria<br>
              <a href="${SITE_URL}" style="color:#c9a84c;text-decoration:none;">${SITE_URL}</a>
              &nbsp;·&nbsp;
              <a href="mailto:suscripciones@altaprop-app.cl" style="color:#c9a84c;text-decoration:none;">suscripciones@altaprop-app.cl</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function primaryButton(text: string, href: string): string {
  return `<a href="${href}" style="display:inline-block;background:#0a1628;color:#fff;font-size:14px;font-weight:700;padding:14px 32px;border-radius:8px;text-decoration:none;margin-top:8px;">${text}</a>`
}

function warningBox(text: string): string {
  return `<div style="background:#fef3c7;border:1px solid #f59e0b;border-left:4px solid #f59e0b;border-radius:8px;padding:16px 20px;margin:20px 0;">
    <p style="margin:0;font-size:14px;color:#92400e;">${text}</p>
  </div>`
}

function infoBox(text: string): string {
  return `<div style="background:#eff6ff;border:1px solid #3b82f6;border-left:4px solid #3b82f6;border-radius:8px;padding:16px 20px;margin:20px 0;">
    <p style="margin:0;font-size:14px;color:#1e40af;">${text}</p>
  </div>`
}

// ── EMAIL: Trial ending soon (sent 2 days before) ──────────────────────────────
export function buildTrialEndingSoonEmail(name: string, planName: string, trialEndsAt: string) {
  const date = new Date(trialEndsAt).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })
  const content = `
    <h2 style="margin:0 0 8px;font-size:22px;color:#0a1628;">Tu prueba gratuita termina pronto</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#64748b;">Hola ${name}, te recordamos que tu periodo de prueba del plan <strong>${planName}</strong> finaliza el <strong>${date}</strong>.</p>
    ${warningBox('Para continuar usando todas las funciones, activa tu suscripción antes de que venza el periodo de prueba.')}
    <p style="font-size:15px;color:#374151;">Si no activas tu plan, tu cuenta volverá al estado gratuito y perderás acceso a los beneficios del plan ${planName}.</p>
    ${primaryButton('Activar mi suscripción', `${SITE_URL}/dashboard/plan`)}
    <p style="margin:24px 0 0;font-size:13px;color:#94a3b8;">Si tienes dudas escríbenos a <a href="mailto:suscripciones@altaprop-app.cl" style="color:#c9a84c;">suscripciones@altaprop-app.cl</a></p>`
  return { from: FROM_EMAIL, subject: `⏰ Tu prueba de ${planName} termina en 2 días`, html: baseWrapper(content) }
}

// ── EMAIL: Trial expired ────────────────────────────────────────────────────────
export function buildTrialExpiredEmail(name: string, planName: string) {
  const content = `
    <h2 style="margin:0 0 8px;font-size:22px;color:#0a1628;">Tu periodo de prueba ha terminado</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#64748b;">Hola ${name}, tu prueba gratuita del plan <strong>${planName}</strong> ha finalizado.</p>
    ${warningBox('Tu cuenta ha vuelto al estado gratuito. Activa tu suscripción para recuperar el acceso completo.')}
    <p style="font-size:15px;color:#374151;">Puedes suscribirte en cualquier momento desde tu panel de control.</p>
    ${primaryButton('Suscribirme ahora', `${SITE_URL}/dashboard/plan`)}
    <p style="margin:24px 0 0;font-size:13px;color:#94a3b8;">¿Tienes preguntas? Contáctanos en <a href="mailto:suscripciones@altaprop-app.cl" style="color:#c9a84c;">suscripciones@altaprop-app.cl</a></p>`
  return { from: FROM_EMAIL, subject: `Tu prueba de ${planName} ha finalizado`, html: baseWrapper(content) }
}

// ── EMAIL: Subscription renewing soon (3 days before) ─────────────────────────
export function buildRenewalReminderEmail(name: string, planName: string, price: number, renewsAt: string) {
  const date = new Date(renewsAt).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })
  const content = `
    <h2 style="margin:0 0 8px;font-size:22px;color:#0a1628;">Tu suscripción se renueva pronto</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#64748b;">Hola ${name}, te recordamos que tu plan <strong>${planName}</strong> (USD $${price}/mes) se renovará el <strong>${date}</strong>.</p>
    ${infoBox(`Se realizará un cobro de USD $${price} para renovar tu suscripción por un mes más.`)}
    <p style="font-size:15px;color:#374151;">Si deseas cancelar o pausar tu suscripción antes de la renovación, puedes hacerlo desde tu panel de control.</p>
    ${primaryButton('Gestionar mi plan', `${SITE_URL}/dashboard/plan`)}
    <p style="margin:24px 0 0;font-size:13px;color:#94a3b8;">¿Necesitas ayuda? <a href="mailto:suscripciones@altaprop-app.cl" style="color:#c9a84c;">suscripciones@altaprop-app.cl</a></p>`
  return { from: FROM_EMAIL, subject: `📅 Tu plan ${planName} se renueva en 3 días`, html: baseWrapper(content) }
}

// ── EMAIL: Subscription expired / payment due ──────────────────────────────────
export function buildSubscriptionExpiredEmail(name: string, planName: string, price: number) {
  const content = `
    <h2 style="margin:0 0 8px;font-size:22px;color:#dc2626;">Tu suscripción ha vencido</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#64748b;">Hola ${name}, tu suscripción al plan <strong>${planName}</strong> ha vencido y está pendiente de pago.</p>
    ${warningBox('Tu acceso a las funciones premium está temporalmente suspendido. Renueva tu plan para recuperar el acceso completo.')}
    <p style="font-size:15px;color:#374151;">Para renovar tu suscripción por USD $${price}/mes, haz clic en el botón a continuación:</p>
    ${primaryButton('Renovar mi suscripción', `${SITE_URL}/dashboard/plan`)}
    <p style="font-size:13px;color:#94a3b8;margin-top:16px;">Si no renuevas en los próximos 7 días, tu suscripción será cancelada definitivamente.</p>
    <p style="margin:24px 0 0;font-size:13px;color:#94a3b8;">¿Tienes problemas con el pago? <a href="mailto:suscripciones@altaprop-app.cl" style="color:#c9a84c;">suscripciones@altaprop-app.cl</a></p>`
  return { from: FROM_EMAIL, subject: `⚠️ Tu suscripción ${planName} ha vencido`, html: baseWrapper(content) }
}

// ── EMAIL: Subscription canceled ───────────────────────────────────────────────
export function buildCanceledEmail(name: string, planName: string, endsAt: string | null) {
  const dateStr = endsAt
    ? `hasta el ${new Date(endsAt).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })}`
    : 'inmediatamente'
  const content = `
    <h2 style="margin:0 0 8px;font-size:22px;color:#0a1628;">Suscripción cancelada</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#64748b;">Hola ${name}, hemos cancelado tu suscripción al plan <strong>${planName}</strong>. Tendrás acceso ${dateStr}.</p>
    ${infoBox('Puedes reactivar tu suscripción en cualquier momento desde tu panel de control.')}
    <p style="font-size:15px;color:#374151;">Lamentamos verte partir. Si tienes algún comentario sobre por qué cancelaste, nos ayudaría mucho saberlo.</p>
    ${primaryButton('Reactivar mi plan', `${SITE_URL}/dashboard/plan`)}
    <p style="margin:24px 0 0;font-size:13px;color:#94a3b8;">¿Fue un error? Escríbenos a <a href="mailto:suscripciones@altaprop-app.cl" style="color:#c9a84c;">suscripciones@altaprop-app.cl</a></p>`
  return { from: FROM_EMAIL, subject: `Suscripción ${planName} cancelada`, html: baseWrapper(content) }
}

// ── EMAIL: Subscription paused ─────────────────────────────────────────────────
export function buildPausedEmail(name: string, planName: string) {
  const content = `
    <h2 style="margin:0 0 8px;font-size:22px;color:#0a1628;">Suscripción pausada</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#64748b;">Hola ${name}, tu suscripción al plan <strong>${planName}</strong> ha sido pausada.</p>
    ${infoBox('No se realizarán cobros mientras tu suscripción esté pausada. Puedes reactivarla en cualquier momento.')}
    <p style="font-size:15px;color:#374151;">Cuando retomes tu suscripción, continuará desde donde la dejaste.</p>
    ${primaryButton('Reactivar mi suscripción', `${SITE_URL}/dashboard/plan`)}
    <p style="margin:24px 0 0;font-size:13px;color:#94a3b8;">¿Tienes dudas? <a href="mailto:suscripciones@altaprop-app.cl" style="color:#c9a84c;">suscripciones@altaprop-app.cl</a></p>`
  return { from: FROM_EMAIL, subject: `Tu plan ${planName} está pausado`, html: baseWrapper(content) }
}

// ── Shared send helper ─────────────────────────────────────────────────────────
export async function sendSubscriptionEmail(to: string, email: ReturnType<typeof buildCanceledEmail>) {
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) return
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: email.from, to, subject: email.subject, html: email.html }),
  })
}
