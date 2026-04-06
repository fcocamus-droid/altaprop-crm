const BRAND = {
  navy:   '#1a2332',
  gold:   '#c9a84c',
  light:  '#f8f9fb',
  border: '#e5e7eb',
}

function emailWrapper(content: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Altaprop</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:${BRAND.navy};padding:32px 40px 28px;text-align:center;">
            <p style="margin:0;font-size:28px;font-weight:800;letter-spacing:-0.5px;">
              <span style="color:#ffffff;">Alta</span><span style="color:${BRAND.gold};">prop</span>
            </p>
            <p style="margin:8px 0 0;font-size:12px;color:rgba(255,255,255,0.55);letter-spacing:1.5px;text-transform:uppercase;">
              Plataforma Inmobiliaria
            </p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px 40px 32px;">
            ${content}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:${BRAND.light};border-top:1px solid ${BRAND.border};padding:24px 40px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">
              Este correo fue enviado por <strong style="color:${BRAND.navy};">Altaprop</strong> ·
              <a href="https://www.altaprop-app.cl" style="color:${BRAND.gold};text-decoration:none;">www.altaprop-app.cl</a>
            </p>
            <p style="margin:6px 0 0;font-size:11px;color:#c4c9d4;">
              Si crees que este mensaje es un error, por favor ignóralo o contáctanos.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export interface AgentAssignmentEmailData {
  agentName:     string
  propertyTitle: string
  propertyAddress: string | null
  propertyCity:  string | null
  propertySector: string | null
  propertyPrice: number
  propertyCurrency: string
  propertyOperation: string
  assignedByName: string
  dashboardUrl:  string
}

export function buildAgentAssignmentEmail(d: AgentAssignmentEmailData): { subject: string; html: string } {
  const operationLabel = d.propertyOperation === 'arriendo' ? 'Arriendo' : 'Venta'
  const priceFormatted =
    d.propertyCurrency === 'UF'  ? `${d.propertyPrice} UF` :
    d.propertyCurrency === 'USD' ? `$${d.propertyPrice.toLocaleString('en-US')} USD` :
    `$${d.propertyPrice.toLocaleString('es-CL')}`
  const location = [d.propertyAddress, d.propertySector, d.propertyCity].filter(Boolean).join(', ')

  const html = emailWrapper(`
    <!-- Greeting -->
    <p style="margin:0 0 6px;font-size:22px;font-weight:700;color:${BRAND.navy};">
      🏠 Nueva propiedad asignada
    </p>
    <p style="margin:0 0 28px;font-size:15px;color:#374151;">
      Hola <strong>${d.agentName}</strong>, se te asignó una nueva propiedad para trabajar.
      Revisa los detalles a continuación y comienza a gestionar las visitas y postulaciones.
    </p>

    <!-- Property card -->
    <div style="background:${BRAND.light};border:1px solid ${BRAND.border};border-left:4px solid ${BRAND.gold};border-radius:12px;padding:24px 28px;margin:0 0 28px;">
      <p style="margin:0 0 4px;font-size:11px;color:${BRAND.gold};font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">
        ${operationLabel}
      </p>
      <p style="margin:0 0 10px;font-size:18px;font-weight:700;color:${BRAND.navy};">${d.propertyTitle}</p>
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:5px 0;color:#6b7280;font-size:13px;width:130px;">📍 Ubicación</td>
          <td style="padding:5px 0;color:${BRAND.navy};font-size:13px;font-weight:600;">${location || '—'}</td>
        </tr>
        <tr>
          <td style="padding:5px 0;color:#6b7280;font-size:13px;">💰 Precio</td>
          <td style="padding:5px 0;color:${BRAND.navy};font-size:13px;font-weight:600;">${priceFormatted}</td>
        </tr>
        <tr>
          <td style="padding:5px 0;color:#6b7280;font-size:13px;">📋 Operación</td>
          <td style="padding:5px 0;color:${BRAND.navy};font-size:13px;font-weight:600;">${operationLabel}</td>
        </tr>
        <tr>
          <td style="padding:5px 0;color:#6b7280;font-size:13px;">👤 Asignado por</td>
          <td style="padding:5px 0;color:${BRAND.navy};font-size:13px;font-weight:600;">${d.assignedByName}</td>
        </tr>
      </table>
    </div>

    <!-- What to do next -->
    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:18px 22px;margin:0 0 28px;">
      <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#92400e;">¿Qué puedes hacer ahora?</p>
      <ul style="margin:0;padding:0 0 0 18px;color:#78350f;font-size:13px;line-height:1.8;">
        <li>Revisar los detalles de la propiedad en tu panel</li>
        <li>Configurar horarios de visita disponibles</li>
        <li>Gestionar postulaciones de interesados</li>
        <li>Coordinar visitas con los postulantes</li>
      </ul>
    </div>

    <!-- CTA -->
    <div style="text-align:center;margin:0 0 8px;">
      <a href="${d.dashboardUrl}"
         style="display:inline-block;background:${BRAND.navy};color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 36px;border-radius:10px;letter-spacing:0.2px;">
        Ver Propiedad en mi Panel →
      </a>
    </div>
    <p style="margin:16px 0 0;font-size:12px;color:#9ca3af;text-align:center;">
      O copia este enlace: <a href="${d.dashboardUrl}" style="color:${BRAND.gold};word-break:break-all;">${d.dashboardUrl}</a>
    </p>
  `)

  return {
    subject: `🏠 Nueva propiedad asignada: ${d.propertyTitle}`,
    html,
  }
}

export async function sendAgentEmail(to: string, subject: string, html: string): Promise<void> {
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Altaprop <propiedades@altaprop-app.cl>',
      to,
      subject,
      html,
    }),
  })
}
