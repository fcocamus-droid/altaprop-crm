import { jsPDF } from 'jspdf'

/**
 * Whitelist-based sanitizer: keeps ONLY characters that Helvetica (latin-1) can render.
 * Allows: printable ASCII (0x20-0x7E), latin-1 supplement (0xA0-0xFF which covers all
 * Spanish accents: á é í ó ú ñ ü Á É Í Ó Ú Ñ Ü ¿ ¡ etc.), tabs and newlines.
 * Everything else (emojis, arrows, symbols, extended unicode) is stripped.
 */
function sanitize(text: string | null | undefined): string {
  if (!text) return ''
  return text
    // Keep only latin-1 printable range + newlines/tabs
    .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, '')
    // Collapse multiple spaces
    .replace(/[ \t]{2,}/g, ' ')
    // Collapse 3+ consecutive newlines into 2
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export interface PropertyPDFData {
  property: {
    title: string
    description?: string | null
    type: string
    operation: string
    price: number
    currency: string
    address?: string | null
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
  }
  images: string[] // base64 strings
  agent: { name: string; phone?: string | null; email: string }
  brand: { name: string; logoBase64?: string | null; phone?: string | null; email?: string | null }
}

function fmt(price: number, currency: string) {
  if (currency === 'UF')  return `${price.toLocaleString('es-CL')} UF`
  if (currency === 'USD') return `USD ${price.toLocaleString('en-US')}`
  return `$${price.toLocaleString('es-CL')} CLP`
}

const OP_LABELS: Record<string, string> = {
  arriendo: 'Arriendo', arriendo_temporal: 'Arriendo Temporal', venta: 'Venta',
}
const TYPE_LABELS: Record<string, string> = {
  departamento: 'Departamento', casa: 'Casa', casa_condominio: 'Casa en Condominio',
  monoambiente: 'Monoambiente', terreno: 'Terreno', terreno_comercial: 'Terreno Comercial',
  oficina: 'Oficina', local: 'Local Comercial', bodega: 'Bodega',
  edificio: 'Edificio', hotel: 'Hotel', nave_industrial: 'Nave Industrial',
  villa: 'Villa', quinta: 'Quinta',
}

export function generatePropertyPDF(data: PropertyPDFData): Buffer {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  const ML = 15 // margin left
  const MR = 15 // margin right
  const CW = W - ML - MR // content width
  let y = 0

  const { property: p, images, agent, brand } = data

  // ── Colors ────────────────────────────────────────────────────────────────
  const NAVY  = [27, 42, 74]   as [number,number,number]
  const GOLD  = [201, 168, 76] as [number,number,number]
  const GRAY  = [107, 114, 128] as [number,number,number]
  const LGRAY = [200, 200, 200] as [number,number,number]
  const LIGHT = [248, 249, 251] as [number,number,number]
  const WHITE = [255, 255, 255] as [number,number,number]
  const DARK  = [55, 65, 81]   as [number,number,number]

  function newPage() {
    doc.addPage()
    y = 20
  }

  function checkPage(needed: number) {
    if (y + needed > H - 20) newPage()
  }

  // ── HEADER ────────────────────────────────────────────────────────────────
  doc.setFillColor(...NAVY)
  doc.rect(0, 0, W, 40, 'F')

  // Logo
  if (brand.logoBase64) {
    try {
      doc.addImage(brand.logoBase64, 'JPEG', ML, 7, 50, 26)
    } catch {
      doc.setTextColor(...GOLD); doc.setFontSize(18); doc.setFont('helvetica', 'bold')
      doc.text(brand.name, ML, 23)
    }
  } else {
    doc.setTextColor(...GOLD); doc.setFontSize(18); doc.setFont('helvetica', 'bold')
    doc.text(brand.name, ML, 22)
    doc.setTextColor(180, 180, 180); doc.setFontSize(8); doc.setFont('helvetica', 'normal')
    doc.text('GESTIÓN INMOBILIARIA', ML, 29)
  }

  // Operation badge (top right)
  const opLabel = OP_LABELS[p.operation] || p.operation
  doc.setFillColor(...GOLD)
  doc.roundedRect(W - 50, 13, 35, 13, 3, 3, 'F')
  doc.setTextColor(...NAVY); doc.setFontSize(9); doc.setFont('helvetica', 'bold')
  doc.text(opLabel.toUpperCase(), W - 32.5, 21, { align: 'center' })

  // Contact (top right, below badge)
  if (brand.email || brand.phone) {
    const contact = [brand.phone, brand.email].filter(Boolean).join('  |  ')
    doc.setTextColor(180, 180, 180); doc.setFontSize(7); doc.setFont('helvetica', 'normal')
    doc.text(contact, W - MR, 31, { align: 'right' })
  }

  y = 50

  // ── TITLE & PRICE ─────────────────────────────────────────────────────────
  doc.setTextColor(...NAVY); doc.setFontSize(16); doc.setFont('helvetica', 'bold')
  const titleLines = doc.splitTextToSize(sanitize(p.title), CW)
  doc.text(titleLines, ML, y)
  y += titleLines.length * 7

  // Location
  const location = [p.address, p.sector, p.city, p.region].filter(Boolean).map(sanitize).join(', ')
  if (location) {
    doc.setTextColor(...GRAY); doc.setFontSize(9); doc.setFont('helvetica', 'normal')
    doc.text(location, ML, y)
    y += 6
  }

  // Price
  doc.setTextColor(...NAVY); doc.setFontSize(20); doc.setFont('helvetica', 'bold')
  doc.text(fmt(p.price, p.currency), ML, y + 5)
  if (p.common_expenses && p.operation !== 'venta') {
    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(...GRAY)
    doc.text(`+ Gastos comunes: $${p.common_expenses.toLocaleString('es-CL')} CLP/mes`, ML + 80, y + 2)
  }
  y += 13

  // Divider
  doc.setDrawColor(...LGRAY); doc.setLineWidth(0.3)
  doc.line(ML, y, W - MR, y)
  y += 8

  // ── IMAGES ────────────────────────────────────────────────────────────────
  const maxImgs = Math.min(images.length, 6)
  if (maxImgs > 0) {
    const cols = maxImgs === 1 ? 1 : maxImgs <= 2 ? 2 : 3
    const gap = 2
    const imgW = (CW - gap * (cols - 1)) / cols
    const imgH = imgW * 0.65
    const rows = Math.ceil(maxImgs / cols)

    checkPage(rows * (imgH + gap) + 6)

    for (let i = 0; i < maxImgs; i++) {
      const col = i % cols
      const row = Math.floor(i / cols)
      const x = ML + col * (imgW + gap)
      const iy = y + row * (imgH + gap)
      try {
        if (images[i]) {
          doc.addImage(images[i], 'JPEG', x, iy, imgW, imgH)
        } else {
          doc.setFillColor(...LIGHT); doc.rect(x, iy, imgW, imgH, 'F')
        }
      } catch {
        doc.setFillColor(...LIGHT); doc.rect(x, iy, imgW, imgH, 'F')
      }
    }
    y += rows * (imgH + gap) + 8
  }

  // ── FICHA TÉCNICA ─────────────────────────────────────────────────────────
  checkPage(20)
  doc.setFillColor(...NAVY)
  doc.rect(ML, y, CW, 9, 'F')
  doc.setTextColor(...WHITE); doc.setFontSize(9); doc.setFont('helvetica', 'bold')
  doc.text('FICHA TÉCNICA', ML + 4, y + 6)
  y += 13

  const details: [string, string][] = []
  const typeLabel = TYPE_LABELS[p.type] || p.type
  if (typeLabel) details.push(['Tipo', typeLabel])
  if (p.bedrooms != null) details.push(['Dormitorios', String(p.bedrooms)])
  if (p.bathrooms != null) details.push(['Baños', String(p.bathrooms)])
  if (p.half_bathrooms) details.push(['Medio Baño', String(p.half_bathrooms)])
  if (p.sqm != null) details.push(['Sup. Total', `${p.sqm} m²`])
  if (p.covered_sqm != null) details.push(['Sup. Construida', `${p.covered_sqm} m²`])
  if (p.terrace_sqm != null) details.push(['Terraza / Logia', `${p.terrace_sqm} m²`])
  if (p.parking) details.push(['Estacionamientos', String(p.parking)])
  if (p.storage) details.push(['Bodegas', String(p.storage)])
  if (p.floor_level != null) details.push(['Piso / Nivel', String(p.floor_level)])
  if (p.floor_count != null) details.push(['Pisos Edificio', String(p.floor_count)])
  if (p.year_built) details.push(['Año Construcción', String(p.year_built)])
  if (p.condition) details.push(['Condición', p.condition])
  if (p.style) details.push(['Estilo', p.style])
  if (p.furnished) details.push(['Amoblada', 'Sí'])
  if (p.pets_allowed) details.push(['Mascotas', 'Permitidas'])
  if (p.exclusive) details.push(['Exclusiva', 'Sí'])
  if (p.common_expenses && p.operation !== 'venta') details.push(['Gastos Comunes', `$${p.common_expenses.toLocaleString('es-CL')} CLP/mes`])
  if (p.contribuciones && p.operation === 'venta') details.push(['Contribuciones', `$${p.contribuciones.toLocaleString('es-CL')} CLP/trimestre`])

  const colW2 = CW / 2
  const rowH2 = 9
  details.forEach(([label, value], i) => {
    const col = i % 2
    const row = Math.floor(i / 2)
    const rx = ML + col * colW2
    const ry = y + row * rowH2
    checkPage(rowH2)
    const bg: [number,number,number] = row % 2 === 0 ? [250, 250, 252] : WHITE
    doc.setFillColor(...bg)
    doc.rect(rx, ry - 0.5, colW2, rowH2, 'F')
    doc.setDrawColor(...LGRAY)
    doc.rect(rx, ry - 0.5, colW2, rowH2, 'S')
    doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor(...GRAY)
    doc.text(label.toUpperCase(), rx + 3, ry + 3.5)
    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(...DARK)
    doc.text(value, rx + 3, ry + 7.5)
  })
  y += Math.ceil(details.length / 2) * rowH2 + 10

  // ── DESCRIPTION ───────────────────────────────────────────────────────────
  if (p.description) {
    const cleanDesc = sanitize(p.description)
    if (cleanDesc) {
      const lineH = 5.5
      const padX = 5, padY = 5
      const textW = CW - padX * 2

      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      const descLines = doc.splitTextToSize(cleanDesc, textW)
      const maxLines = 30
      const showLines: string[] = descLines.slice(0, maxLines)
      const boxH = padY * 2 + showLines.length * lineH + 4

      // Section header
      checkPage(16 + boxH)
      doc.setFillColor(...NAVY)
      doc.rect(ML, y, CW, 9, 'F')
      doc.setTextColor(...WHITE); doc.setFontSize(9); doc.setFont('helvetica', 'bold')
      doc.text('DESCRIPCIÓN', ML + 4, y + 6)
      y += 11

      // Text box with light background
      doc.setFillColor(250, 250, 252)
      doc.setDrawColor(...LGRAY)
      doc.rect(ML, y, CW, boxH, 'FD')

      doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(...DARK)
      doc.text(showLines, ML + padX, y + padY + lineH - 1, { lineHeightFactor: 1.4 })
      y += boxH + 8
    }
  }

  // ── AMENITIES ─────────────────────────────────────────────────────────────
  if (p.amenities && p.amenities.length > 0) {
    checkPage(25)
    doc.setFillColor(...NAVY)
    doc.rect(ML, y, CW, 9, 'F')
    doc.setTextColor(...WHITE); doc.setFontSize(9); doc.setFont('helvetica', 'bold')
    doc.text('CARACTERÍSTICAS Y AMENITIES', ML + 4, y + 6)
    y += 12

    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(...DARK)
    const amenText = p.amenities.map(sanitize).join('  ·  ')
    const amenLines = doc.splitTextToSize(amenText, CW - 4)
    doc.text(amenLines.slice(0, 5), ML + 2, y)
    y += Math.min(amenLines.length, 5) * 5 + 10
  }

  // ── AGENT CARD ────────────────────────────────────────────────────────────
  checkPage(30)
  doc.setFillColor(...NAVY)
  doc.roundedRect(ML, y, CW, 28, 3, 3, 'F')
  doc.setTextColor(...GOLD); doc.setFontSize(8); doc.setFont('helvetica', 'bold')
  doc.text('AGENTE A CARGO', ML + 5, y + 8)
  doc.setTextColor(...WHITE); doc.setFontSize(12); doc.setFont('helvetica', 'bold')
  doc.text(sanitize(agent.name), ML + 5, y + 16)
  const contactStr = [agent.phone, agent.email].filter(Boolean).map(sanitize).join('   ·   ')
  doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(200, 200, 200)
  doc.text(contactStr, ML + 5, y + 22)
  y += 34

  // ── FOOTER ────────────────────────────────────────────────────────────────
  const totalPages = (doc as any).internal.pages.length - 1
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFillColor(...LIGHT)
    doc.rect(0, H - 12, W, 12, 'F')
    doc.setDrawColor(...LGRAY); doc.setLineWidth(0.2)
    doc.line(0, H - 12, W, H - 12)
    doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(...GRAY)
    doc.text(`${sanitize(brand.name)}  ·  altaprop-app.cl`, ML, H - 5)
    doc.text(`Página ${i} de ${totalPages}`, W - MR, H - 5, { align: 'right' })
  }

  return Buffer.from(doc.output('arraybuffer'))
}
