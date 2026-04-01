import PDFDocument from 'pdfkit'

// ── Colours ───────────────────────────────────────────────────────────────────
const NAVY  = '#1a2332'
const GOLD  = '#c9a84c'
const LIGHT = '#f1f5f9'
const GRAY  = '#64748b'
const BLACK = '#1a1a1a'

// ── Helpers ───────────────────────────────────────────────────────────────────
function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return [r, g, b]
}

function fillRect(doc: PDFKit.PDFDocument, x: number, y: number, w: number, h: number, color: string) {
  doc.rect(x, y, w, h).fill(color)
}

function labelValue(
  doc: PDFKit.PDFDocument,
  label: string,
  value: string,
  x: number,
  y: number,
  pageWidth: number
) {
  const colW = (pageWidth - x * 2) / 2
  doc.font('Helvetica-Bold').fontSize(8).fillColor(GRAY).text(label.toUpperCase(), x, y, { width: colW - 10 })
  doc.font('Helvetica').fontSize(9).fillColor(BLACK).text(value || '—', x + colW, y, { width: colW })
}

// ── Parser for notes field ────────────────────────────────────────────────────
export function parseVisitorFromNotes(notes: string | null) {
  if (!notes) return { name: '', rut: '', phone: '', email: '', observation: '' }
  const nameMatch = notes.match(/Solicitud de:\s*([^|]+)/)
  const rutMatch  = notes.match(/RUT:\s*([^|]+)/)
  const telMatch  = notes.match(/Tel:\s*([^|]+)/)
  const emailMatch= notes.match(/Email:\s*([^|]+)/)
  let obs = notes
  obs = obs.replace(/Solicitud de:\s*[^|]+\|?\s*/gi, '')
  obs = obs.replace(/RUT:\s*[^|]+\|?\s*/gi, '')
  obs = obs.replace(/Tel:\s*[^|]+\|?\s*/gi, '')
  obs = obs.replace(/Email:\s*[^|]+\|?\s*/gi, '')
  obs = obs.replace(/^\|\s*/, '').trim()
  return {
    name:        nameMatch?.[1]?.trim()  || '',
    rut:         rutMatch?.[1]?.trim()   || '',
    phone:       telMatch?.[1]?.trim()   || '',
    email:       emailMatch?.[1]?.trim() || '',
    observation: obs,
  }
}

// ── Main PDF builder ──────────────────────────────────────────────────────────
export interface VisitPdfData {
  visitNumber: number
  // Property
  propertyAddress: string
  propertyCity: string
  propertyOperation: string   // 'arriendo' | 'venta'
  propertyCode: string
  propertyUrl: string
  // Visitor
  visitorName: string
  visitorRut: string
  visitorPhone: string
  visitorEmail: string
  visitDate: string           // formatted string
  // Agent
  agentName: string
  agentPhone: string
  agentEmail: string
  agentCompany: string
  // Extras
  observation: string
}

export async function generateVisitPdf(data: VisitPdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 0, size: 'A4', bufferPages: true })
    const chunks: Buffer[] = []
    doc.on('data', c => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const PW = doc.page.width   // 595
    const PH = doc.page.height  // 842
    const M  = 40               // margin
    const CW = PW - M * 2      // content width

    // ── HEADER BACKGROUND ──────────────────────────────────────────────────
    fillRect(doc, 0, 0, PW, 90, NAVY)

    // Logo text
    doc.font('Helvetica-Bold').fontSize(22).fillColor(GOLD)
       .text('ALTAPROP', M, 22, { width: 200, align: 'left' })
    doc.font('Helvetica').fontSize(8).fillColor('#8ca0b5')
       .text('GESTIÓN INMOBILIARIA', M, 48, { width: 200, align: 'left' })

    // Visit number badge (top right)
    const badgeX = PW - M - 140
    doc.roundedRect(badgeX, 18, 140, 54, 8).fill(GOLD)
    doc.font('Helvetica-Bold').fontSize(8).fillColor(NAVY)
       .text('ORDEN DE VISITA', badgeX, 27, { width: 140, align: 'center' })
    doc.font('Helvetica-Bold').fontSize(24).fillColor(NAVY)
       .text(`N° ${data.visitNumber}`, badgeX, 40, { width: 140, align: 'center' })

    // ── GOLD DIVIDER ───────────────────────────────────────────────────────
    fillRect(doc, 0, 90, PW, 5, GOLD)

    // ── TITLE BAND ─────────────────────────────────────────────────────────
    fillRect(doc, 0, 95, PW, 36, LIGHT)
    doc.font('Helvetica-Bold').fontSize(14).fillColor(NAVY)
       .text('ORDEN DE VISITA A PROPIEDAD', M, 107, { width: CW, align: 'center' })

    let y = 148

    // ── SECTION: DATOS DE LA PROPIEDAD ─────────────────────────────────────
    fillRect(doc, M, y, CW, 22, NAVY)
    doc.font('Helvetica-Bold').fontSize(9).fillColor(GOLD)
       .text('DATOS DE LA PROPIEDAD', M + 10, y + 6, { width: CW })
    y += 22

    const propRows: [string, string][] = [
      ['Dirección de la propiedad', data.propertyAddress],
      ['Comuna',                    data.propertyCity],
      ['Tipo de operación',         data.propertyOperation === 'arriendo' ? 'Arriendo' : data.propertyOperation === 'venta' ? 'Venta' : data.propertyOperation],
      ['Código propiedad',          data.propertyCode],
    ]
    propRows.forEach(([label, value], i) => {
      fillRect(doc, M, y, CW, 22, i % 2 === 0 ? '#ffffff' : '#f8fafc')
      doc.rect(M, y, CW, 22).stroke('#e2e8f0')
      labelValue(doc, label, value, M + 10, y + 7, PW)
      y += 22
    })

    y += 10

    // ── SECTION: DATOS DEL VISITANTE ───────────────────────────────────────
    fillRect(doc, M, y, CW, 22, NAVY)
    doc.font('Helvetica-Bold').fontSize(9).fillColor(GOLD)
       .text('DATOS DEL VISITANTE', M + 10, y + 6, { width: CW })
    y += 22

    const visitorRows: [string, string][] = [
      ['Nombre completo', data.visitorName],
      ['RUT',             data.visitorRut],
      ['Teléfono',        data.visitorPhone],
      ['Email',           data.visitorEmail],
      ['Fecha de visita', data.visitDate],
    ]
    visitorRows.forEach(([label, value], i) => {
      fillRect(doc, M, y, CW, 22, i % 2 === 0 ? '#ffffff' : '#f8fafc')
      doc.rect(M, y, CW, 22).stroke('#e2e8f0')
      labelValue(doc, label, value, M + 10, y + 7, PW)
      y += 22
    })

    y += 10

    // ── SECTION: DATOS DEL AGENTE ──────────────────────────────────────────
    fillRect(doc, M, y, CW, 22, NAVY)
    doc.font('Helvetica-Bold').fontSize(9).fillColor(GOLD)
       .text('DATOS DEL AGENTE', M + 10, y + 6, { width: CW })
    y += 22

    const agentRows: [string, string][] = [
      ['Nombre del Agente', data.agentName],
      ['Teléfono',          data.agentPhone],
      ['Correo',            data.agentEmail],
      ['Empresa',           data.agentCompany],
    ]
    agentRows.forEach(([label, value], i) => {
      fillRect(doc, M, y, CW, 22, i % 2 === 0 ? '#ffffff' : '#f8fafc')
      doc.rect(M, y, CW, 22).stroke('#e2e8f0')
      labelValue(doc, label, value, M + 10, y + 7, PW)
      y += 22
    })

    y += 10

    // ── SECTION: DECLARACIÓN ───────────────────────────────────────────────
    fillRect(doc, M, y, CW, 22, NAVY)
    doc.font('Helvetica-Bold').fontSize(9).fillColor(GOLD)
       .text('DECLARACIÓN', M + 10, y + 6, { width: CW })
    y += 22

    const declText =
      'El visitante declara haber conocido la propiedad a través de Alta Prop Gestión Inmobiliaria ' +
      'y se compromete a no realizar negociaciones directas con el propietario sin la intermediación del corredor de propiedades.'

    fillRect(doc, M, y, CW, 52, '#fffbeb')
    doc.rect(M, y, CW, 52).stroke('#fde68a')
    doc.font('Helvetica').fontSize(8.5).fillColor(BLACK)
       .text(declText, M + 10, y + 8, { width: CW - 20, align: 'justify' })
    y += 52 + 10

    // ── SECTION: OBSERVACIÓN ───────────────────────────────────────────────
    fillRect(doc, M, y, CW, 22, NAVY)
    doc.font('Helvetica-Bold').fontSize(9).fillColor(GOLD)
       .text('OBSERVACIÓN / COMENTARIO', M + 10, y + 6, { width: CW })
    y += 22

    const obsHeight = 44
    fillRect(doc, M, y, CW, obsHeight, '#ffffff')
    doc.rect(M, y, CW, obsHeight).stroke('#e2e8f0')
    doc.font('Helvetica').fontSize(9).fillColor(BLACK)
       .text(data.observation || '—', M + 10, y + 8, { width: CW - 20 })
    y += obsHeight + 10

    // ── SECTION: LINK PROPIEDAD ────────────────────────────────────────────
    fillRect(doc, M, y, CW, 22, NAVY)
    doc.font('Helvetica-Bold').fontSize(9).fillColor(GOLD)
       .text('LINK PROPIEDAD', M + 10, y + 6, { width: CW })
    y += 22

    fillRect(doc, M, y, CW, 24, '#f0f9ff')
    doc.rect(M, y, CW, 24).stroke('#bae6fd')
    doc.font('Helvetica').fontSize(8.5).fillColor('#0369a1')
       .text(data.propertyUrl, M + 10, y + 8, { width: CW - 20 })
    y += 24 + 24

    // ── SIGNATURE LINES ────────────────────────────────────────────────────
    const sigY = PH - 100
    const halfW = (CW - 40) / 2

    // Left sig
    doc.moveTo(M, sigY).lineTo(M + halfW, sigY).stroke('#94a3b8')
    doc.font('Helvetica').fontSize(8).fillColor(GRAY)
       .text('Firma Visitante', M, sigY + 4, { width: halfW, align: 'center' })
    doc.font('Helvetica').fontSize(7.5).fillColor(GRAY)
       .text(data.visitorName, M, sigY + 14, { width: halfW, align: 'center' })

    // Right sig
    const sigRx = M + halfW + 40
    doc.moveTo(sigRx, sigY).lineTo(sigRx + halfW, sigY).stroke('#94a3b8')
    doc.font('Helvetica').fontSize(8).fillColor(GRAY)
       .text('Firma Corredor', sigRx, sigY + 4, { width: halfW, align: 'center' })
    doc.font('Helvetica').fontSize(7.5).fillColor(GRAY)
       .text(data.agentName, sigRx, sigY + 14, { width: halfW, align: 'center' })

    // ── FOOTER ─────────────────────────────────────────────────────────────
    fillRect(doc, 0, PH - 30, PW, 30, NAVY)
    doc.font('Helvetica').fontSize(7.5).fillColor('#8ca0b5')
       .text('Alta Prop Gestión Inmobiliaria  |  altaprop-app.cl', 0, PH - 19, { width: PW, align: 'center' })

    doc.end()
  })
}
