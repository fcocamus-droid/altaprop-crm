import { jsPDF } from 'jspdf'

interface VisitOrderData {
  visitNumber: number
  property: { title: string; address: string; city: string; type: string; operation: string; id: string }
  visitor: { name: string; rut: string; email: string; phone: string }
  agent: { name: string; phone: string; email: string }
  scheduledDate: string
  scheduledTime: string
  message: string
  siteUrl: string
}

export function generateVisitPDF(data: VisitOrderData): jsPDF {
  const doc = new jsPDF()
  const w = doc.internal.pageSize.getWidth()
  let y = 15

  // Header
  doc.setFillColor(27, 42, 74) // navy
  doc.rect(0, 0, w, 40, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.text('Alta', w / 2 - 18, 22)
  doc.setTextColor(196, 169, 98) // gold
  doc.text('prop', w / 2 + 10, 22)
  doc.setTextColor(196, 169, 98)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Gestión Inmobiliaria', w / 2, 32, { align: 'center' })

  // Visit number
  doc.setTextColor(100, 100, 100)
  doc.setFontSize(9)
  doc.text(`N° ${String(data.visitNumber).padStart(4, '0')}`, w - 15, 50, { align: 'right' })

  // Title
  y = 55
  doc.setTextColor(27, 42, 74)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('ORDEN DE VISITA A PROPIEDAD', w / 2, y, { align: 'center' })

  // Helper for tables
  function drawSection(title: string, rows: [string, string][], startY: number): number {
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(27, 42, 74)
    doc.text(title, 15, startY)
    startY += 5

    doc.setFontSize(9)
    rows.forEach(([label, value], i) => {
      const rowY = startY + i * 8
      // Label cell
      doc.setFillColor(245, 245, 245)
      doc.rect(15, rowY, 55, 8, 'F')
      doc.setDrawColor(200, 200, 200)
      doc.rect(15, rowY, 55, 8, 'S')
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(50, 50, 50)
      doc.text(label, 17, rowY + 5.5)

      // Value cell
      doc.rect(70, rowY, w - 85, 8, 'S')
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(80, 80, 80)
      doc.text(value || '-', 72, rowY + 5.5)
    })

    return startY + rows.length * 8 + 8
  }

  // Property data
  y = drawSection('DATOS DE LA PROPIEDAD', [
    ['Dirección', data.property.address || '-'],
    ['Comuna', data.property.city || '-'],
    ['Tipo de operación', data.property.operation === 'arriendo' ? 'Arriendo' : 'Venta'],
    ['Código propiedad', data.property.id.substring(0, 8).toUpperCase()],
  ], 68)

  // Visitor data
  y = drawSection('DATOS DEL VISITANTE', [
    ['Nombre completo', data.visitor.name],
    ['RUT', data.visitor.rut || '-'],
    ['Teléfono', data.visitor.phone || '-'],
    ['Email', data.visitor.email || '-'],
    ['Fecha de visita', `${data.scheduledDate} a las ${data.scheduledTime}`],
  ], y)

  // Agent data
  y = drawSection('DATOS DEL AGENTE', [
    ['Nombre del Agente', data.agent.name],
    ['Teléfono', data.agent.phone || '-'],
    ['Correo', data.agent.email || '-'],
    ['Empresa', 'Altaprop Gestión Inmobiliaria'],
  ], y)

  // Declaration
  y += 2
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(27, 42, 74)
  doc.text('DECLARACIÓN', 15, y)
  y += 7
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(60, 60, 60)
  const declaration = 'El visitante declara haber conocido la propiedad a través de Altaprop Gestión Inmobiliaria y se compromete a no realizar negociaciones directas con el propietario sin la intermediación del corredor de propiedades.'
  const lines = doc.splitTextToSize(declaration, w - 30)
  doc.text(lines, 15, y)
  y += lines.length * 5 + 5

  // Observation
  if (data.message) {
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(27, 42, 74)
    doc.text('OBSERVACIÓN / COMENTARIO', 15, y)
    y += 5
    doc.setDrawColor(200, 200, 200)
    doc.rect(15, y, w - 30, 15, 'S')
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(80, 80, 80)
    doc.text(data.message.substring(0, 120), 17, y + 6)
    y += 20
  }

  // Property link
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(196, 169, 98)
  doc.text('LINK PROPIEDAD', 15, y)
  y += 5
  doc.setDrawColor(200, 200, 200)
  doc.rect(15, y, w - 30, 10, 'S')
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(60, 60, 160)
  doc.text(`${data.siteUrl}/propiedades/${data.property.id}`, w / 2, y + 6, { align: 'center' })
  y += 18

  // Signatures
  if (y < 250) {
    doc.setDrawColor(100, 100, 100)
    doc.line(15, y + 15, 80, y + 15)
    doc.line(w / 2 + 10, y + 15, w - 15, y + 15)
    doc.setFontSize(9)
    doc.setTextColor(80, 80, 80)
    doc.text('Firma visitante', 15, y + 20)
    doc.setFont('helvetica', 'bold')
    doc.text(data.agent.name, w / 2 + 10, y + 10)
    doc.setFont('helvetica', 'normal')
    doc.text('Firma corredor', w / 2 + 10, y + 20)
  }

  // Footer
  doc.setFillColor(248, 248, 248)
  doc.rect(0, 282, w, 15, 'F')
  doc.setFontSize(8)
  doc.setTextColor(150, 150, 150)
  doc.text('Altaprop - Gestión Inmobiliaria Integral | www.loginaltaprop.cl', w / 2, 289, { align: 'center' })

  return doc
}
