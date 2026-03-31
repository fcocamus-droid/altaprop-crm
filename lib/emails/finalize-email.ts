/**
 * Shared email builder for rented/sold confirmation sent to the applicant.
 * Used by both finalizeProperty (properties.ts) and finalizeApplicationStatus (applications.ts).
 */

interface BankInfo {
  bank_name?: string | null
  bank_account_type?: string | null
  bank_account_holder?: string | null
  bank_account_rut?: string | null
  bank_account_number?: string | null
  bank_email?: string | null
}

function buildBankSection(bank: BankInfo, accentColor: string, bgColor: string, borderColor: string): string {
  const rows = [
    bank.bank_name           ? `<tr><td style="padding:6px 0;color:${accentColor};font-size:14px;width:160px;">Banco</td><td style="padding:6px 0;color:#1a2332;font-size:14px;font-weight:600;">${bank.bank_name}</td></tr>` : '',
    bank.bank_account_type   ? `<tr><td style="padding:6px 0;color:${accentColor};font-size:14px;">Tipo de cuenta</td><td style="padding:6px 0;color:#1a2332;font-size:14px;font-weight:600;">${bank.bank_account_type}</td></tr>` : '',
    bank.bank_account_holder ? `<tr><td style="padding:6px 0;color:${accentColor};font-size:14px;">Nombre destinatario</td><td style="padding:6px 0;color:#1a2332;font-size:14px;font-weight:600;">${bank.bank_account_holder}</td></tr>` : '',
    bank.bank_account_rut    ? `<tr><td style="padding:6px 0;color:${accentColor};font-size:14px;">RUT destinatario</td><td style="padding:6px 0;color:#1a2332;font-size:14px;font-weight:600;">${bank.bank_account_rut}</td></tr>` : '',
    bank.bank_account_number ? `<tr><td style="padding:6px 0;color:${accentColor};font-size:14px;">Número de cuenta</td><td style="padding:6px 0;color:#1a2332;font-size:14px;font-weight:600;">${bank.bank_account_number}</td></tr>` : '',
    bank.bank_email          ? `<tr><td style="padding:6px 0;color:${accentColor};font-size:14px;">Correo electrónico</td><td style="padding:6px 0;color:#1a2332;font-size:14px;font-weight:600;">${bank.bank_email}</td></tr>` : '',
  ].filter(Boolean).join('')

  if (!rows) return ''

  return `
    <div style="background:${bgColor};border:1px solid ${borderColor};border-left:4px solid ${accentColor};border-radius:10px;padding:20px 24px;margin:0 0 28px;">
      <p style="margin:0 0 6px;font-size:11px;color:${accentColor};font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">🏦 Datos para el Pago</p>
      <p style="margin:0 0 14px;font-size:13px;color:#374151;">Realiza la transferencia a la siguiente cuenta bancaria del propietario:</p>
      <table style="width:100%;border-collapse:collapse;">${rows}</table>
      <p style="margin:14px 0 0;font-size:12px;color:#64748b;">También puedes encontrar estos datos en tu panel de postulaciones junto al botón para subir tu comprobante de pago.</p>
    </div>`
}

export function buildFinalizeEmail(
  name: string,
  propertyTitle: string,
  status: 'rented' | 'sold',
  dashboardUrl: string,
  bank?: BankInfo | Record<string, string | null> | null
): string {
  const isRent = status === 'rented'

  const accentColor  = isRent ? '#1d4ed8' : '#7c3aed'
  const bgGradient   = isRent ? 'linear-gradient(135deg,#eff6ff,#dbeafe)' : 'linear-gradient(135deg,#faf5ff,#ede9fe)'
  const borderColor  = isRent ? '#3b82f6' : '#7c3aed'
  const titleColor   = isRent ? '#1e3a8a' : '#4c1d95'
  const subtitleColor= isRent ? '#1d4ed8' : '#5b21b6'
  const cardBg       = isRent ? '#eff6ff' : '#faf5ff'
  const cardBorder   = isRent ? '#bfdbfe' : '#ddd6fe'
  const badgeBg      = isRent ? '#dbeafe' : '#ede9fe'
  const badgeColor   = isRent ? '#1e3a8a' : '#4c1d95'
  const emoji        = isRent ? '🔑' : '🏆'
  const title        = isRent ? '¡Arriendo Confirmado!' : '¡Compra Confirmada!'
  const subtitle     = isRent ? 'Bienvenido/a a tu nuevo hogar' : '¡Tu nueva propiedad te espera!'
  const bodyText     = isRent
    ? `El arriendo de la propiedad <strong style="color:#1a2332;">"${propertyTitle}"</strong> ha sido <strong style="color:${accentColor};">confirmado oficialmente</strong> a tu nombre.`
    : `La compra de la propiedad <strong style="color:#1a2332;">"${propertyTitle}"</strong> ha sido <strong style="color:${accentColor};">confirmada oficialmente</strong> a tu nombre.`
  const roleLabel    = isRent ? 'Arrendatario' : 'Comprador/a'
  const badgeLabel   = isRent ? '🔑 Arrendada' : '🏆 Vendida'
  const detailTitle  = isRent ? 'Detalle del Arriendo' : 'Detalle de la Compra'
  const farewell     = isRent ? '¡Felicitaciones y bienvenido/a a tu nuevo hogar!' : '¡Bienvenido/a a tu nueva propiedad!'

  const bankSection = bank ? buildBankSection(bank as BankInfo, accentColor, cardBg, cardBorder) : ''

  const step1Text = bank
    ? 'Realiza la transferencia con los datos bancarios indicados arriba y sube tu comprobante de pago en tu panel.'
    : `Un ejecutivo de <strong>Altaprop</strong> se pondrá en contacto contigo para coordinar ${isRent ? 'la firma del contrato y la entrega de llaves' : 'los siguientes pasos de la escrituración'}.`

  return `
<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:600px;margin:32px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

  <div style="background:#1a2332;padding:28px 40px;text-align:center;">
    <h1 style="color:#c9a84c;margin:0;font-size:26px;font-weight:800;letter-spacing:2px;">ALTAPROP</h1>
    <p style="color:#6b7f96;margin:4px 0 0;font-size:12px;letter-spacing:1px;text-transform:uppercase;">CRM Inmobiliario</p>
  </div>

  <div style="background:${bgGradient};border-bottom:3px solid ${borderColor};padding:32px 40px;text-align:center;">
    <div style="font-size:52px;margin-bottom:12px;">${emoji}</div>
    <h2 style="color:${titleColor};margin:0;font-size:26px;font-weight:700;">${title}</h2>
    <p style="color:${subtitleColor};margin:8px 0 0;font-size:15px;">${subtitle}</p>
  </div>

  <div style="padding:36px 40px;">
    <p style="color:#1a2332;font-size:16px;margin:0 0 8px;">Estimado/a <strong>${name}</strong>,</p>
    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 24px;">
      ¡Excelentes noticias! ${bodyText}
    </p>

    <div style="background:${cardBg};border:1px solid ${cardBorder};border-left:4px solid ${accentColor};border-radius:10px;padding:20px 24px;margin:0 0 28px;">
      <p style="margin:0 0 14px;font-size:11px;color:${accentColor};font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">${detailTitle}</p>
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:5px 0;color:${accentColor};font-size:14px;width:140px;">Propiedad</td>
          <td style="padding:5px 0;color:#1a2332;font-size:14px;font-weight:600;">${propertyTitle}</td>
        </tr>
        <tr>
          <td style="padding:5px 0;color:${accentColor};font-size:14px;">${roleLabel}</td>
          <td style="padding:5px 0;color:#1a2332;font-size:14px;font-weight:600;">👤 ${name}</td>
        </tr>
        <tr>
          <td style="padding:5px 0;color:${accentColor};font-size:14px;">Estado</td>
          <td style="padding:5px 0;"><span style="background:${badgeBg};color:${badgeColor};font-size:13px;font-weight:700;padding:3px 12px;border-radius:20px;">${badgeLabel}</span></td>
        </tr>
      </table>
    </div>

    ${bankSection}

    <h3 style="color:#1a2332;font-size:16px;font-weight:700;margin:0 0 16px;">Próximos pasos</h3>
    <div style="margin-bottom:14px;display:flex;align-items:flex-start;">
      <div style="background:#1a2332;color:#c9a84c;width:26px;height:26px;border-radius:50%;font-size:13px;font-weight:800;text-align:center;line-height:26px;margin-right:14px;flex-shrink:0;">1</div>
      <p style="margin:0;color:#374151;font-size:14px;line-height:1.6;padding-top:3px;">${step1Text}</p>
    </div>
    <div style="margin-bottom:14px;display:flex;align-items:flex-start;">
      <div style="background:#1a2332;color:#c9a84c;width:26px;height:26px;border-radius:50%;font-size:13px;font-weight:800;text-align:center;line-height:26px;margin-right:14px;flex-shrink:0;">2</div>
      <p style="margin:0;color:#374151;font-size:14px;line-height:1.6;padding-top:3px;">Revisa tu correo y tu panel para cualquier documento o instrucción adicional.</p>
    </div>
    <div style="margin-bottom:32px;display:flex;align-items:flex-start;">
      <div style="background:#1a2332;color:#c9a84c;width:26px;height:26px;border-radius:50%;font-size:13px;font-weight:800;text-align:center;line-height:26px;margin-right:14px;flex-shrink:0;">3</div>
      <p style="margin:0;color:#374151;font-size:14px;line-height:1.6;padding-top:3px;">Puedes seguir el estado de tu postulación en cualquier momento desde tu panel personal.</p>
    </div>

    <div style="text-align:center;margin:0 0 28px;">
      <a href="${dashboardUrl}" style="background:#1a2332;color:#c9a84c;padding:15px 40px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block;">Ver mi Panel →</a>
    </div>
    <p style="color:#64748b;font-size:14px;line-height:1.6;text-align:center;margin:0;">
      ${farewell}<br><strong style="color:#1a2332;">El equipo de Altaprop</strong>
    </p>
  </div>

  <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 40px;text-align:center;">
    <p style="color:#94a3b8;font-size:12px;margin:0;"><a href="https://altaprop-app.cl" style="color:#94a3b8;text-decoration:none;">altaprop-app.cl</a></p>
  </div>
</div>
</body></html>`
}
