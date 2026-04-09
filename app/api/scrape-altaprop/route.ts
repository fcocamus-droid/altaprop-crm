import { NextResponse } from 'next/server'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function POST(request: Request) {
  try {
    const { url } = await request.json()

    if (!url || !url.includes('altaprop.cl')) {
      return NextResponse.json({ error: 'URL de altaprop.cl no válida' }, { status: 400, headers: cors })
    }

    // Fetch the page (altaprop.cl has no anti-bot protection)
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)

    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      signal: controller.signal,
    })
    clearTimeout(timeout)

    const html = await res.text()

    // Extract __NEXT_DATA__ (altaprop.cl uses Next.js via alterestate)
    const nextDataMatch = html.match(/__NEXT_DATA__[^>]*>([\s\S]*?)<\/script>/)
    if (!nextDataMatch) {
      return NextResponse.json({ error: 'No se encontraron datos de la propiedad' }, { status: 400, headers: cors })
    }

    const root = JSON.parse(nextDataMatch[1])
    const p = root.props?.pageProps?.property || root.props?.pageProps

    if (!p || !p.name) {
      return NextResponse.json({ error: 'Estructura de datos no reconocida' }, { status: 400, headers: cors })
    }

    // Map alterestate property data to our format
    const result = {
      title: p.name || '',
      price: p.sale_price || p.rent_price || p.rental_price || 0,
      currency: p.sale_price ? (p.currency_sale || 'CLP') :
                p.rent_price ? (p.currency_rent || 'CLP') : 'CLP',
      operation: p.sale_price ? 'venta' : 'arriendo',
      type: mapStyle(p.style),
      bedrooms: p.room || 0,
      bathrooms: p.bathroom || 0,
      sqm: p.property_area || 0,
      address: extractAddress(p.description || ''),
      city: p.sector || p.city || '',
      sector: p.sector !== p.city ? p.city : '',
      description: cleanDescription(p.description || ''),
      images: extractImages(p),
      gastos_comunes: p.maintenance_fee ? `${p.maintenance_fee.toLocaleString('es-CL')} CLP` : '',
      estacionamientos: p.parkinglot || 0,
      bodegas: 0,
      antiguedad: '',
      piso: p.floor_level || '',
      orientacion: '',
      amoblado: false,
      ascensor: false,
      mascotas: false,
      terrace_sqm: p.terrace_area || 0,
      terrain_sqm: p.terrain_area || 0,
      source: 'altaprop.cl',
    }

    return NextResponse.json(result, { headers: cors })

  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error de conexión' }, { status: 500, headers: cors })
  }
}

function mapStyle(style: string): string {
  const map: Record<string, string> = {
    '1': 'casa', '2': 'departamento', '3': 'oficina', '4': 'local',
    '5': 'terreno', '6': 'villa', '7': 'departamento', '8': 'casa',
  }
  return map[style] || 'departamento'
}

function cleanDescription(html: string): string {
  return html
    .replace(/<[^>]+>/g, '\n')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .substring(0, 2000)
}

function extractAddress(description: string): string {
  // Try to find address patterns in description
  const patterns = [
    /(?:en|ubicado en|dirección:?)\s*([A-ZÁÉÍÓÚÑa-záéíóúñ\s.]+\d{2,5})/i,
    /([A-ZÁÉÍÓÚÑa-záéíóúñ\s.]+\d{3,5})/,
  ]
  for (const pat of patterns) {
    const m = description.replace(/<[^>]+>/g, '').match(pat)
    if (m) return m[1].trim().substring(0, 100)
  }
  return ''
}

function extractImages(p: any): string[] {
  const images: string[] = []

  // Gallery images (array of { image: url })
  if (Array.isArray(p.gallery_image)) {
    p.gallery_image.forEach((img: any) => {
      const url = img.image || img.url || img.src || ''
      if (url) images.push(url)
    })
  }

  // Featured image as fallback
  if (!images.length && p.featured_image) {
    images.push(p.featured_image)
  }

  return images.slice(0, 20)
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: cors })
}
