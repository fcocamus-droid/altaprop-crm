import type { SubscriberBrand } from '@/lib/utils/subscriber-brand'
import { DEFAULT_BRAND } from '@/lib/utils/subscriber-brand'

const BRAND = {
  navy:   '#1a2332',
  gold:   '#c9a84c',
  light:  '#f8f9fb',
  border: '#e5e7eb',
}

function fmt(price: number, currency: string) {
  if (currency === 'UF')  return `${price.toLocaleString('es-CL')} UF`
  if (currency === 'USD') return `USD ${price.toLocaleString('en-US')}`
  return `$${price.toLocaleString('es-CL')} CLP`
}

const OP_LABELS: Record<string, string> = {
  arriendo: 'Arriendo',
  arriendo_temporal: 'Arriendo Temporal',
  venta: 'Venta',
}
const TYPE_LABELS: Record<string, string> = {
  departamento: 'Departamento', casa: 'Casa', casa_condominio: 'Casa en Condominio',
  monoambiente: 'Monoambiente', terreno: 'Terreno', terreno_comercial: 'Terreno Comercial',
  oficina: 'Oficina', local: 'Local Comercial', bodega: 'Bodega',
  edificio: 'Edificio', hotel: 'Hotel', nave_industrial: 'Nave Industrial',
  villa: 'Villa', quinta: 'Quinta',
}

export interface PropertyFichaData {
  title: string
  description?: string | null
  type: string
  operation: string
  price: number
  currency: string
  address?: string | null
  address2?: string | null
  city?: string | null
  sector?: string | null
  region?: string | null
  bedrooms?: number | null
  bathrooms?: number | null
  half_bathrooms?: number | null
  sqm?: number | null
  covered_sqm?: number | null
  terrace_sqm?: number | null
  parking?: number | null
  storage?: number | null
  floor_level?: number | null
  floor_count?: number | null
  year_built?: number | null
  condition?: string | null
  style?: string | null
  furnished?: boolean | null
  pets_allowed?: boolean | null
  exclusive?: boolean | null
  common_expenses?: number | null
  contribuciones?: number | null
  amenities?: string[] | null
  images?: { url: string }[]
  video_url?: string | null
  virtual_tour_url?: string | null
}

export interface FichaEmailOptions {
  property: PropertyFichaData
  agent: { name: string; phone?: string | null; email: string }
  recipientName?: string
  brand?: SubscriberBrand
}

function row(label: string, value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') return ''
  return `
    <tr>
      <td style="padding:7px 12px;background:#f9fafb;border:1px solid #e5e7eb;font-size:12px;color:#6b7280;font-weight:600;width:160px;vertical-align:top;">${label}</td>
      <td style="padding:7px 12px;border:1px solid #e5e7eb;font-size:12px;color:#1a2332;font-weight:500;">${value}</td>
    </tr>`
}

function badge(text: string) {
  return `<span style="display:inline-block;background:#1a2332;color:#c9a84c;font-size:10px;font-weight:700;padding:3px 10px;border-radius:20px;letter-spacing:0.5px;text-transform:uppercase;">${text}</span>`
}

export function buildPropertyFichaEmail({ property: p, agent, recipientName, brand = DEFAULT_BRAND }: FichaEmailOptions): { subject: string; html: string } {
  const opLabel  = OP_LABELS[p.operation]  || p.operation
  const typeLabel = TYPE_LABELS[p.type]    || p.type
  const location = [p.address, p.address2, p.sector, p.city, p.region].filter(Boolean).join(', ')
  const priceStr = fmt(p.price, p.currency)

  const headerHtml = brand.logoUrl
    ? `<img src="${brand.logoUrl}" alt="${brand.name}" style="max-height:52px;max-width:200px;object-fit:contain;display:inline-block;" />`
    : `<p style="margin:0;font-size:26px;font-weight:800;color:#c9a84c;letter-spacing:2px;">${brand.displayName}</p>
       <p style="margin:4px 0 0;font-size:11px;color:rgba(255,255,255,0.55);letter-spacing:1.5px;text-transform:uppercase;">Gestión Inmobiliaria</p>`

  // Images grid (first 6)
  const imgs = (p.images || []).slice(0, 6)
  const imagesHtml = imgs.length > 0 ? `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
      <tr>
        ${imgs.slice(0, 3).map(img => `
          <td width="33%" style="padding:2px;">
            <img src="${img.url}" alt="" style="width:100%;height:130px;object-fit:cover;border-radius:8px;display:block;" />
          </td>`).join('')}
      </tr>
      ${imgs.length > 3 ? `<tr>
        ${imgs.slice(3, 6).map(img => `
          <td width="33%" style="padding:2px;">
            <img src="${img.url}" alt="" style="width:100%;height:130px;object-fit:cover;border-radius:8px;display:block;" />
          </td>`).join('')}
      </tr>` : ''}
    </table>` : ''

  // Tech details table
  const detailsHtml = `
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 24px;">
      ${row('Tipo de Propiedad', typeLabel)}
      ${row('Operación', opLabel)}
      ${p.bedrooms != null ? row('Dormitorios', String(p.bedrooms)) : ''}
      ${p.bathrooms != null ? row('Baños completos', String(p.bathrooms)) : ''}
      ${p.half_bathrooms ? row('Medio baño', String(p.half_bathrooms)) : ''}
      ${p.sqm != null ? row('Superficie total', `${p.sqm} m²`) : ''}
      ${p.covered_sqm != null ? row('Superficie construida', `${p.covered_sqm} m²`) : ''}
      ${p.terrace_sqm != null ? row('Terraza / Logia', `${p.terrace_sqm} m²`) : ''}
      ${p.parking ? row('Estacionamientos', String(p.parking)) : ''}
      ${p.storage ? row('Bodegas', String(p.storage)) : ''}
      ${p.floor_level != null ? row('Piso / Nivel', String(p.floor_level)) : ''}
      ${p.floor_count != null ? row('Pisos del edificio', String(p.floor_count)) : ''}
      ${p.year_built ? row('Año construcción', String(p.year_built)) : ''}
      ${p.condition ? row('Condición', p.condition) : ''}
      ${p.style ? row('Estilo', p.style) : ''}
      ${p.furnished ? row('Amoblada', 'Sí') : ''}
      ${p.pets_allowed ? row('Mascotas permitidas', 'Sí') : ''}
      ${p.exclusive ? row('Exclusiva', 'Sí') : ''}
      ${p.common_expenses && p.operation !== 'venta' ? row('Gastos comunes', `$${p.common_expenses.toLocaleString('es-CL')} CLP/mes`) : ''}
      ${p.contribuciones && p.operation === 'venta' ? row('Contribuciones', `$${p.contribuciones.toLocaleString('es-CL')} CLP/año`) : ''}
    </table>`

  // Description
  const descHtml = p.description ? `
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:18px 20px;margin:0 0 24px;">
      <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Descripción</p>
      <p style="margin:0;font-size:13px;color:#374151;line-height:1.7;">${p.description.replace(/\n/g, '<br/>')}</p>
    </div>` : ''

  // Amenities
  const amenHtml = p.amenities && p.amenities.length > 0 ? `
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:16px 20px;margin:0 0 24px;">
      <p style="margin:0 0 10px;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Características y Amenities</p>
      <div style="display:flex;flex-wrap:wrap;gap:6px;">
        ${p.amenities.map(a => `<span style="background:#e5e7eb;color:#374151;font-size:11px;padding:3px 10px;border-radius:20px;">${a}</span>`).join('')}
      </div>
    </div>` : ''

  // Video/Tour links
  const linksHtml = (p.video_url || p.virtual_tour_url) ? `
    <div style="margin:0 0 24px;">
      ${p.video_url ? `<a href="${p.video_url}" style="display:inline-block;margin-right:12px;color:${BRAND.gold};font-size:13px;font-weight:600;text-decoration:none;">▶ Ver Video</a>` : ''}
      ${p.virtual_tour_url ? `<a href="${p.virtual_tour_url}" style="display:inline-block;color:${BRAND.gold};font-size:13px;font-weight:600;text-decoration:none;">🔭 Tour Virtual</a>` : ''}
    </div>` : ''

  // Agent card
  const agentHtml = `
    <div style="background:${BRAND.navy};border-radius:12px;padding:20px 24px;margin:0 0 8px;">
      <p style="margin:0 0 4px;font-size:10px;font-weight:700;color:${BRAND.gold};text-transform:uppercase;letter-spacing:0.8px;">Agente a cargo</p>
      <p style="margin:0 0 6px;font-size:16px;font-weight:700;color:#ffffff;">${agent.name}</p>
      <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.7);">
        ${[agent.phone, agent.email].filter(Boolean).join('  ·  ')}
      </p>
    </div>`

  const greeting = recipientName ? `Hola <strong>${recipientName}</strong>, te compartimos la ficha completa de la propiedad.` : 'Te compartimos la ficha completa de esta propiedad.'

  const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ficha de Propiedad</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:${BRAND.navy};padding:28px 40px;text-align:center;">
            ${headerHtml}
          </td>
        </tr>

        <!-- Hero: Operation + Title + Price + Location -->
        <tr>
          <td style="padding:32px 40px 0;">
            <p style="margin:0 0 12px;">${badge(opLabel)}</p>
            <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:${BRAND.navy};line-height:1.3;">${p.title}</h1>
            ${location ? `<p style="margin:0 0 12px;font-size:13px;color:#6b7280;">📍 ${location}</p>` : ''}
            <p style="margin:0 0 4px;font-size:28px;font-weight:800;color:${BRAND.navy};">${priceStr}</p>
            ${p.common_expenses && p.operation !== 'venta' ? `<p style="margin:0 0 24px;font-size:12px;color:#6b7280;">+ Gastos comunes: $${p.common_expenses.toLocaleString('es-CL')} CLP/mes</p>` : '<div style="margin-bottom:24px;"></div>'}
          </td>
        </tr>

        <!-- Images -->
        ${imgs.length > 0 ? `<tr><td style="padding:0 40px 24px;">${imagesHtml}</td></tr>` : ''}

        <!-- Body -->
        <tr>
          <td style="padding:0 40px 32px;">
            <p style="margin:0 0 20px;font-size:14px;color:#374151;">${greeting}</p>

            <!-- Section header -->
            <p style="margin:0 0 10px;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.8px;">Ficha Técnica</p>
            ${detailsHtml}
            ${descHtml}
            ${amenHtml}
            ${linksHtml}
            ${agentHtml}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:${BRAND.light};border-top:1px solid ${BRAND.border};padding:24px 40px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">
              Este correo fue enviado por <strong style="color:${BRAND.navy};">${brand.name}</strong> · <a href="${brand.siteUrl}" style="color:${BRAND.gold};text-decoration:none;">${brand.website}</a>
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

  return {
    subject: `🏠 Ficha de Propiedad: ${p.title}`,
    html,
  }
}
