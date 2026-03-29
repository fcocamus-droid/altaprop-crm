import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { url } = await request.json()

    if (!url || !url.startsWith('http')) {
      return NextResponse.json({ error: 'Ingresa una URL valida' }, { status: 400 })
    }

    if (url.includes('portalinmobiliario.com') || url.includes('mercadolibre')) {
      return await scrapePortalInmobiliario(url)
    }

    return await scrapeGenericSite(url)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error al procesar' }, { status: 500 })
  }
}

async function scrapeGenericSite(url: string) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
    })

    if (!res.ok) {
      return NextResponse.json({ error: 'No se pudo acceder al sitio. Verifica la URL.' })
    }

    const html = await res.text()

    const title = extractMeta(html, 'og:title') || extractTag(html, 'title') || ''
    const description = extractMeta(html, 'og:description') || extractMeta(html, 'description') || ''
    const price = extractPrice(html)
    const images = extractPropertyPhotos(html, url)

    const lowerText = (title + ' ' + description).toLowerCase()
    const operation = lowerText.includes('arriendo') || lowerText.includes('alquiler') ? 'arriendo' : 'venta'
    const type = detectPropertyType(lowerText)

    // Extract address from structured data or meta
    const address = extractMeta(html, 'og:street-address') || extractFromJsonLd(html, 'streetAddress') || ''
    const city = extractFromJsonLd(html, 'addressLocality') || ''

    return NextResponse.json({
      title: cleanText(title).replace(/\s*[-|–]\s*[^-|–]*$/, ''), // Remove site name suffix
      price: price.amount,
      currency: price.currency,
      operation,
      type,
      bedrooms: extractNumber(html, /(\d+)\s*(?:dormitorio|habitaci|bedroom|dorm)/i),
      bathrooms: extractNumber(html, /(\d+)\s*(?:ba[nñ]o|bathroom)/i),
      sqm: extractNumber(html, /(\d+(?:[.,]\d+)?)\s*(?:m[²2]|mt2|metros?\s*cuadrados?|sup(?:erficie)?)/i),
      address: cleanText(address),
      city: cleanText(city),
      sector: '',
      description: cleanText(description).substring(0, 500),
      images,
    })
  } catch {
    return NextResponse.json({ error: 'Error extrayendo datos del sitio' })
  }
}

// ==================== PHOTO EXTRACTION ====================

function extractPropertyPhotos(html: string, baseUrl: string): string[] {
  let photos: string[] = []

  // STRATEGY 1: JSON-LD structured data (most reliable)
  photos = extractFromJsonLdImages(html)
  if (photos.length >= 3) {
    return photos.slice(0, 15).map(src => resolveUrl(src, baseUrl)).filter(Boolean)
  }

  // STRATEGY 2: og:image tags (multiple og:image = gallery)
  const ogPhotos = extractAllOgImages(html)
  if (ogPhotos.length >= 2) {
    return ogPhotos.slice(0, 15).map(src => resolveUrl(src, baseUrl)).filter(Boolean)
  }

  // STRATEGY 3: Gallery/carousel containers
  const galleryPhotos = extractGalleryImages(html, baseUrl)
  if (galleryPhotos.length >= 2) {
    return galleryPhotos.slice(0, 15)
  }

  // STRATEGY 4: Large images from the page (fallback)
  const largePhotos = extractLargeImages(html, baseUrl)

  // Combine all found photos, remove duplicates
  const all = [...ogPhotos.map(s => resolveUrl(s, baseUrl)), ...galleryPhotos, ...largePhotos]
  const unique = deduplicateImages(all.filter(Boolean))

  return unique.slice(0, 15)
}

function extractFromJsonLdImages(html: string): string[] {
  const images: string[] = []
  const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let m
  while ((m = jsonLdRegex.exec(html)) !== null) {
    try {
      const data = JSON.parse(m[1])
      // Direct image/photo arrays
      const imgSources = data.image || data.photo || data.images || data.photos || []
      if (typeof imgSources === 'string') {
        images.push(imgSources)
      } else if (Array.isArray(imgSources)) {
        for (const img of imgSources) {
          if (typeof img === 'string') images.push(img)
          else if (img?.url) images.push(img.url)
          else if (img?.contentUrl) images.push(img.contentUrl)
        }
      }
      // Check @graph array
      if (data['@graph']) {
        for (const item of data['@graph']) {
          if (item.image) {
            if (typeof item.image === 'string') images.push(item.image)
            else if (Array.isArray(item.image)) {
              for (const img of item.image) {
                if (typeof img === 'string') images.push(img)
                else if (img?.url) images.push(img.url)
              }
            }
          }
        }
      }
    } catch {}
  }
  return images
}

function extractAllOgImages(html: string): string[] {
  const images: string[] = []
  const regex = /<meta[^>]*(?:property|name)=["']og:image["'][^>]*content=["']([^"']+)["']/gi
  let m
  while ((m = regex.exec(html)) !== null) { images.push(m[1]) }
  // Reverse format
  const regex2 = /<meta[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["']og:image["']/gi
  while ((m = regex2.exec(html)) !== null) {
    if (!images.includes(m[1])) images.push(m[1])
  }
  return images
}

function extractGalleryImages(html: string, baseUrl: string): string[] {
  const images: string[] = []

  // Find content inside gallery/carousel/slider containers
  const containerPatterns = [
    /class=["'][^"']*(?:gallery|galeria|carousel|slider|swiper|lightbox|fotorama|property-images|listing-images|photo-gallery)[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|section|ul)>/gi,
    /id=["'][^"']*(?:gallery|galeria|carousel|slider|photos|imagenes)[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|section|ul)>/gi,
  ]

  for (const pattern of containerPatterns) {
    let m
    while ((m = pattern.exec(html)) !== null) {
      const container = m[1]
      extractImagesFromHtml(container, baseUrl, images)
    }
  }

  return deduplicateImages(images)
}

function extractLargeImages(html: string, baseUrl: string): string[] {
  const images: string[] = []
  const blacklist = /logo|icon|favicon|sprite|avatar|badge|brand|banner|nav|menu|social|facebook|twitter|instagram|whatsapp|youtube|google|analytics|pixel|tracking|placeholder|blank|spacer|arrow|chevron|close|search|cart|user|profile|1x1|transparent|widget|button|emoji|flag/i

  // All img, data-src, data-lazy-src
  extractImagesFromHtml(html, baseUrl, images)

  return images.filter(src => {
    if (blacklist.test(src)) return false
    // Must look like a photo URL (has image extension or cloud storage)
    if (!src.match(/\.(jpg|jpeg|png|webp)/i) && !src.match(/cloudinary|imgix|amazonaws|supabase|wp-content\/uploads|media\//i)) return false
    // Filter out tiny thumbnails by URL pattern
    if (src.match(/(\d+)x(\d+)/)) {
      const sizeMatch = src.match(/(\d+)x(\d+)/)
      if (sizeMatch && parseInt(sizeMatch[1]) < 150 && parseInt(sizeMatch[2]) < 150) return false
    }
    return true
  })
}

function extractImagesFromHtml(html: string, baseUrl: string, images: string[]) {
  // Regular src
  const srcRegex = /(?:src|data-src|data-lazy-src|data-original|data-full|data-large)=["']([^"']+)["']/gi
  let m
  while ((m = srcRegex.exec(html)) !== null) {
    const src = m[1]
    if (!src.match(/\.(jpg|jpeg|png|webp|gif)/i) && !src.match(/image|photo|media|upload/i)) continue
    const resolved = resolveUrl(src, baseUrl)
    if (resolved && !images.includes(resolved)) {
      images.push(resolved)
    }
  }

  // Srcset (pick largest)
  const srcsetRegex = /srcset=["']([^"']+)["']/gi
  while ((m = srcsetRegex.exec(html)) !== null) {
    const entries = m[1].split(',').map(s => s.trim().split(/\s+/))
    // Sort by size descriptor (largest first)
    entries.sort((a, b) => {
      const sizeA = parseInt(a[1]?.replace('w', '') || '0')
      const sizeB = parseInt(b[1]?.replace('w', '') || '0')
      return sizeB - sizeA
    })
    if (entries[0]?.[0]) {
      const resolved = resolveUrl(entries[0][0], baseUrl)
      if (resolved && !images.includes(resolved)) {
        images.push(resolved)
      }
    }
  }
}

function deduplicateImages(images: string[]): string[] {
  const seen = new Map<string, string>()
  for (const img of images) {
    // Create a key by removing size/resolution variants
    const key = img
      .replace(/[-_]\d{2,4}x\d{2,4}/g, '')
      .replace(/[?#].*$/, '')
      .replace(/-\d{2,4}w/g, '')
      .replace(/\/thumb[s]?\//i, '/large/')
      .replace(/\/small\//i, '/large/')
      .replace(/\/medium\//i, '/large/')
    if (!seen.has(key)) {
      // Prefer the larger version (longer URL usually = more params = original)
      seen.set(key, img)
    } else if (img.length > (seen.get(key)?.length || 0)) {
      seen.set(key, img)
    }
  }
  const values: string[] = []
  seen.forEach(v => values.push(v))
  return values
}

// ==================== PORTAL INMOBILIARIO ====================

async function scrapePortalInmobiliario(url: string) {
  const idMatch = url.match(/MLC-?(\d+)/)
  if (!idMatch) return NextResponse.json({ fallback: true })

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

// ==================== HELPERS ====================

function extractMeta(html: string, name: string): string {
  const m1 = html.match(new RegExp(`<meta[^>]*(?:property|name)=["']${name}["'][^>]*content=["']([^"']+)["']`, 'i'))
  if (m1) return m1[1]
  const m2 = html.match(new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["']${name}["']`, 'i'))
  return m2?.[1] || ''
}

function extractTag(html: string, tag: string): string {
  const match = html.match(new RegExp(`<${tag}[^>]*>([^<]+)</${tag}>`, 'i'))
  return match?.[1] || ''
}

function extractFromJsonLd(html: string, field: string): string {
  const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let m
  while ((m = jsonLdRegex.exec(html)) !== null) {
    try {
      const text = m[1]
      const fieldRegex = new RegExp(`"${field}"\\s*:\\s*"([^"]+)"`)
      const match = text.match(fieldRegex)
      if (match) return match[1]
    } catch {}
  }
  return ''
}

function extractPrice(html: string): { amount: number; currency: string } {
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
  return match ? parseFloat(match[1].replace(',', '.')) : 0
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

function resolveUrl(src: string, baseUrl: string): string {
  if (!src) return ''
  if (src.startsWith('//')) return 'https:' + src
  if (src.startsWith('/')) { try { return new URL(src, baseUrl).href } catch { return '' } }
  if (src.startsWith('http')) return src
  try { return new URL(src, baseUrl).href } catch { return '' }
}
