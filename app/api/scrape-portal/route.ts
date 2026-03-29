import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { url } = await request.json()

    if (!url || !url.startsWith('http')) {
      return NextResponse.json({ error: 'Ingresa una URL valida' }, { status: 400 })
    }

    // Check if it's Portal Inmobiliario / MercadoLibre
    if (url.includes('portalinmobiliario.com') || url.includes('mercadolibre')) {
      return await scrapePortalInmobiliario(url)
    }

    // Generic scraping for any website
    return await scrapeGenericSite(url)

  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error al procesar' }, { status: 500 })
  }
}

async function scrapeGenericSite(url: string) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AltapropBot/1.0)',
        'Accept': 'text/html',
      },
    })

    if (!res.ok) {
      return NextResponse.json({ error: 'No se pudo acceder al sitio. Verifica la URL.' })
    }

    const html = await res.text()

    // Extract Open Graph and meta tags
    const title = extractMeta(html, 'og:title') || extractTag(html, 'title') || ''
    const description = extractMeta(html, 'og:description') || extractMeta(html, 'description') || ''
    const price = extractPrice(html)

    // Try to detect operation and type from text
    const lowerText = (title + ' ' + description).toLowerCase()
    const operation = lowerText.includes('arriendo') || lowerText.includes('alquiler') ? 'arriendo' : 'venta'
    const type = detectPropertyType(lowerText)

    return NextResponse.json({
      title: cleanText(title),
      price: price.amount,
      currency: price.currency,
      operation,
      type,
      bedrooms: extractNumber(html, /(\d+)\s*(?:dormitorio|habitaci|bedroom|dorm)/i),
      bathrooms: extractNumber(html, /(\d+)\s*(?:ba[nñ]o|bathroom)/i),
      sqm: extractNumber(html, /(\d+(?:\.\d+)?)\s*(?:m[²2]|mt2|metros?\s*cuadrados?)/i),
      address: '',
      city: '',
      sector: '',
      description: cleanText(description).substring(0, 500),
      images: [],
    })
  } catch {
    return NextResponse.json({ error: 'Error extrayendo datos del sitio' })
  }
}

async function scrapePortalInmobiliario(url: string) {
  const idMatch = url.match(/MLC-?(\d+)/)
  if (!idMatch) {
    return NextResponse.json({ fallback: true })
  }

  const itemId = `MLC${idMatch[1]}`

  try {
    const res = await fetch(`https://api.mercadolibre.com/items/${itemId}`, {
      headers: { 'Accept': 'application/json' }
    })
    if (!res.ok) return NextResponse.json({ fallback: true })

    const data = await res.json()
    const attrs = data.attributes || []
    const getAttr = (id: string) => attrs.find((a: any) => a.id === id)?.value_name || ''

    const result = {
      title: data.title || '',
      price: data.price || 0,
      currency: data.currency_id === 'CLF' ? 'UF' : 'CLP',
      operation: data.title?.toLowerCase().includes('arriendo') ? 'arriendo' : 'venta',
      type: mapType(getAttr('PROPERTY_TYPE')),
      bedrooms: parseInt(getAttr('BEDROOMS')) || 0,
      bathrooms: parseInt(getAttr('FULL_BATHROOMS') || getAttr('BATHROOMS')) || 0,
      sqm: parseFloat(getAttr('COVERED_AREA') || getAttr('TOTAL_AREA')) || 0,
      address: data.location?.address_line || '',
      city: data.location?.city?.name || '',
      sector: data.location?.neighborhood?.name || '',
      description: '',
      images: (data.pictures || []).map((p: any) => p.secure_url || p.url),
    }

    try {
      const descRes = await fetch(`https://api.mercadolibre.com/items/${itemId}/description`)
      if (descRes.ok) {
        const d = await descRes.json()
        result.description = d.plain_text || d.text || ''
      }
    } catch {}

    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ fallback: true })
  }
}

// Helpers
function extractMeta(html: string, name: string): string {
  const ogMatch = html.match(new RegExp(`<meta[^>]*(?:property|name)=["']${name}["'][^>]*content=["']([^"']+)["']`, 'i'))
  if (ogMatch) return ogMatch[1]
  const reverseMatch = html.match(new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["']${name}["']`, 'i'))
  return reverseMatch?.[1] || ''
}

function extractTag(html: string, tag: string): string {
  const match = html.match(new RegExp(`<${tag}[^>]*>([^<]+)</${tag}>`, 'i'))
  return match?.[1] || ''
}

function extractPrice(html: string): { amount: number; currency: string } {
  // Try common price patterns
  const ufMatch = html.match(/(?:UF|U\.F\.)\s*[\s:]?\s*([\d.,]+)/i)
  if (ufMatch) return { amount: parseFloat(ufMatch[1].replace(/\./g, '').replace(',', '.')), currency: 'UF' }

  const usdMatch = html.match(/(?:US\$|USD)\s*([\d.,]+)/i)
  if (usdMatch) return { amount: parseFloat(usdMatch[1].replace(/\./g, '').replace(',', '.')), currency: 'USD' }

  const clpMatch = html.match(/\$\s*([\d.]+(?:\.\d{3})*)/i)
  if (clpMatch) return { amount: parseFloat(clpMatch[1].replace(/\./g, '')), currency: 'CLP' }

  return { amount: 0, currency: 'CLP' }
}


function extractNumber(html: string, pattern: RegExp): number {
  const match = html.match(pattern)
  return match ? parseFloat(match[1]) : 0
}

function cleanText(text: string): string {
  return text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim()
}

function detectPropertyType(text: string): string {
  if (text.includes('departamento') || text.includes('depto')) return 'departamento'
  if (text.includes('casa')) return 'casa'
  if (text.includes('oficina')) return 'oficina'
  if (text.includes('local')) return 'local'
  if (text.includes('terreno') || text.includes('parcela')) return 'terreno'
  return 'departamento'
}

function mapType(type: string): string {
  const map: Record<string, string> = {
    'Departamento': 'departamento', 'Casa': 'casa', 'Oficina': 'oficina',
    'Local comercial': 'local', 'Terreno': 'terreno', 'Parcela': 'terreno',
  }
  return map[type] || 'departamento'
}
