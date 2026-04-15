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

    // STRATEGY 1: __NEXT_DATA__ (AlterEstate, Next.js sites)
    const nextDataStart = html.indexOf('__NEXT_DATA__')
    if (nextDataStart !== -1) {
      const jsonStart = html.indexOf('>', nextDataStart) + 1
      const jsonEnd = html.indexOf('</script>', jsonStart)
      if (jsonStart > 0 && jsonEnd > jsonStart) {
        const jsonStr = html.substring(jsonStart, jsonEnd)
        try {
          const nextData = JSON.parse(jsonStr)
          const prop = nextData?.props?.pageProps?.property
          if (prop) {
            return NextResponse.json(parseAlterEstateProperty(prop))
          }
        } catch (e) {
          console.error('__NEXT_DATA__ parse error:', e)
        }
      }
    }

    // STRATEGY 2: Search for property JSON in any script tag
    const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi
    let scriptMatch
    while ((scriptMatch = scriptRegex.exec(html)) !== null) {
      const content = scriptMatch[1]
      if (content.includes('"gallery_image"') || content.includes('"rent_price"') || content.includes('"sale_price"')) {
        // Find the property object
        const propStart = content.indexOf('"property"')
        if (propStart !== -1) {
          // Extract the property object by finding matching braces
          const braceStart = content.indexOf('{', propStart)
          if (braceStart !== -1) {
            const propJson = extractJsonObject(content, braceStart)
            if (propJson) {
              try {
                const prop = JSON.parse(propJson)
                if (prop.name || prop.title || prop.rent_price || prop.sale_price) {
                  return NextResponse.json(parseAlterEstateProperty(prop))
                }
              } catch {}
            }
          }
        }
      }
    }

    // STRATEGY 3: Extract image URLs from cloudfront pattern (AlterEstate CDN)
    const cloudFrontImages: string[] = []
    const cfRegex = /https:\/\/d2kflbb1pmooh4\.cloudfront\.net\/[^"'\s,]+/g
    let cfMatch
    while ((cfMatch = cfRegex.exec(html)) !== null) {
      if (!cloudFrontImages.includes(cfMatch[0])) cloudFrontImages.push(cfMatch[0])
    }
    // Also check d2p0bx8wfdkjkb CDN
    const cfRegex2 = /https:\/\/d2p0bx8wfdkjkb\.cloudfront\.net\/static\/properties\/[^"'\s,]+/g
    while ((cfMatch = cfRegex2.exec(html)) !== null) {
      if (!cloudFrontImages.includes(cfMatch[0])) cloudFrontImages.push(cfMatch[0])
    }

    // STRATEGY 4: Fallback to meta tags + generic extraction
    // If cloudfront images found above, use them
    const title = extractMeta(html, 'og:title') || extractTag(html, 'title') || ''
    const description = extractMeta(html, 'og:description') || extractMeta(html, 'description') || ''
    const price = extractPrice(html)
    const images = extractPropertyPhotos(html, url)

    const lowerText = (title + ' ' + description).toLowerCase()
    const operation = lowerText.includes('arriendo') || lowerText.includes('alquiler') ? 'arriendo' : 'venta'
    const type = detectPropertyType(lowerText)

    const address = extractMeta(html, 'og:street-address') || extractFromJsonLd(html, 'streetAddress') || ''
    const city = extractFromJsonLd(html, 'addressLocality') || ''

    return NextResponse.json({
      title: cleanText(title).replace(/\s*[-|–]\s*[^-|–]*$/, ''),
      price: price.amount,
      currency: price.currency,
      operation,
      type,
      bedrooms: extractNumber(html, /(\d+)\s*(?:dormitorio|habitaci|bedroom|dorm)/i),
      bathrooms: extractNumber(html, /(\d+)\s*(?:ba[nñ]o|bathroom)/i),
      half_bathrooms: extractNumber(html, /(\d+)\s*(?:medio\s*ba[nñ]o|half\s*bath)/i),
      sqm: extractNumber(html, /(\d+(?:[.,]\d+)?)\s*(?:m[²2]|mt2|metros?\s*cuadrados?|sup(?:erficie)?\s*total)/i),
      covered_sqm: extractNumber(html, /(\d+(?:[.,]\d+)?)\s*(?:m[²2]|mt2).*?(?:útil|construid|cubierta)/i) || null,
      terrace_sqm: extractNumber(html, /(\d+(?:[.,]\d+)?)\s*(?:m[²2]|mt2).*?(?:terraza|balcón|balcon)/i) || null,
      address: cleanText(address),
      city: cleanText(city),
      sector: '',
      description: cleanText(description).substring(0, 3000),
      images: cloudFrontImages.length > 0 ? deduplicateByFilename(cloudFrontImages).slice(0, 20) : images,
      common_expenses: 0,
      pets_allowed: false,
      parking: extractNumber(html, /(\d+)\s*(?:estacionamiento|parking|garaje)/i),
      storage: extractNumber(html, /(\d+)\s*(?:bodega|storage)/i),
      floor_level: extractNumber(html, /piso\s*(\d+)/i) || null,
      floor_count: null,
      furnished: lowerText.includes('amoblad') || lowerText.includes('furnished'),
      year_built: null,
      condition: '',
      amenities: [],
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
    return photos.slice(0, 20).map(src => resolveUrl(src, baseUrl)).filter(Boolean)
  }

  // STRATEGY 2: og:image tags (multiple og:image = gallery)
  const ogPhotos = extractAllOgImages(html)
  if (ogPhotos.length >= 2) {
    return ogPhotos.slice(0, 20).map(src => resolveUrl(src, baseUrl)).filter(Boolean)
  }

  // STRATEGY 3: Gallery/carousel containers
  const galleryPhotos = extractGalleryImages(html, baseUrl)
  if (galleryPhotos.length >= 2) {
    return galleryPhotos.slice(0, 20)
  }

  // STRATEGY 4: Large images from the page (fallback)
  const largePhotos = extractLargeImages(html, baseUrl)

  // Combine all found photos, remove duplicates
  const all = [...ogPhotos.map(s => resolveUrl(s, baseUrl)), ...galleryPhotos, ...largePhotos]
  const unique = deduplicateImages(all.filter(Boolean))

  return unique.slice(0, 20)
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
    const getAttrNum = (id: string): number | null => {
      const v = getAttr(id)
      const n = parseFloat(v)
      return isNaN(n) ? null : n
    }

    // ── Currency ──────────────────────────────────────────────────────────
    const currency = data.currency_id === 'CLF' ? 'UF' : data.currency_id === 'USD' ? 'USD' : 'CLP'

    // ── Operation (multi-signal, most reliable first) ─────────────────────
    const titleLower = (data.title || '').toLowerCase()
    const permalinkLower = (data.permalink || '').toLowerCase()
    let operation = 'venta'
    if (
      titleLower.includes('arriendo temporal') ||
      titleLower.includes('alquiler temporal') ||
      titleLower.includes('temporada') ||
      permalinkLower.includes('arriendo-temporal')
    ) {
      operation = 'arriendo_temporal'
    } else if (
      titleLower.includes('arriendo') ||
      titleLower.includes('alquiler') ||
      permalinkLower.includes('arriendo') ||
      permalinkLower.includes('alquiler') ||
      data.sub_type_values?.some((s: any) => typeof s.id === 'string' && (s.id.includes('rent') || s.id.includes('alquiler')))
    ) {
      operation = 'arriendo'
    }

    // ── Surfaces ──────────────────────────────────────────────────────────
    const totalArea = getAttrNum('TOTAL_AREA')
    const coveredArea = getAttrNum('COVERED_AREA')
    const terraceArea = getAttrNum('TERRACE_AREA') || getAttrNum('BALCONY_AREA')
    // sqm = total, covered_sqm = covered
    const sqm = totalArea || coveredArea || 0
    const covered_sqm = coveredArea !== sqm ? coveredArea : null

    // ── Year built ────────────────────────────────────────────────────────
    let year_built: number | null = getAttrNum('CONSTRUCTION_YEAR')
    if (!year_built) {
      const ageStr = getAttr('PROPERTY_AGE')
      const ageNum = parseInt(ageStr)
      if (!isNaN(ageNum) && ageNum > 0 && ageNum < 200) {
        year_built = new Date().getFullYear() - ageNum
      }
    }

    // ── Boolean attributes ────────────────────────────────────────────────
    const furnishedVal = getAttr('FURNISHED')
    const furnished = furnishedVal === 'Sí' || furnishedVal === 'Si' || furnishedVal === '1' || furnishedVal === 'true'
    const petsVal = getAttr('IS_SUITABLE_FOR_PETS')
    const pets_allowed = petsVal === 'Sí' || petsVal === 'Si' || petsVal === '1' || petsVal === 'true'

    // ── Numeric attributes ────────────────────────────────────────────────
    const parking = getAttrNum('PARKING_LOTS') ?? 0
    const storage = getAttrNum('WAREHOUSES') ?? 0
    const floor_level = getAttrNum('UNIT_FLOOR')
    const floor_count = getAttrNum('FLOORS')
    const half_bathrooms = getAttrNum('HALF_BATHROOMS') ?? 0
    const common_expenses = getAttrNum('MAINTENANCE_FEE') ?? 0

    const result: Record<string, unknown> = {
      title: data.title || '',
      price: data.price || 0,
      currency,
      operation,
      type: mapType(getAttr('PROPERTY_TYPE')),
      bedrooms: parseInt(getAttr('BEDROOMS')) || 0,
      bathrooms: parseInt(getAttr('FULL_BATHROOMS') || getAttr('BATHROOMS')) || 0,
      half_bathrooms,
      sqm,
      covered_sqm,
      terrace_sqm: terraceArea,
      parking,
      storage,
      floor_level,
      floor_count,
      furnished,
      pets_allowed,
      common_expenses,
      year_built,
      address: data.location?.address_line || '',
      city: data.location?.city?.name || '',
      sector: data.location?.neighborhood?.name || '',
      description: '',
      images: (data.pictures || []).map((p: any) => p.secure_url || p.url).slice(0, 20),
      amenities: [],
    }

    // ── Description ───────────────────────────────────────────────────────
    // NOTE: GET /items/{id}/description returns 403 for classified listings
    // without auth. We scrape the Portal Inmobiliario page directly instead.
    result.description = await extractMLDescription(url, itemId)

    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ fallback: true })
  }
}

// ==================== ML DESCRIPTION ====================

/**
 * Extract the full description for a Portal Inmobiliario / ML classified listing.
 *
 * Strategy (in order of reliability):
 *  1. Fetch the Portal Inmobiliario HTML page → parse __NEXT_DATA__ JSON
 *     (PI is Next.js; the full description is always embedded server-side)
 *  2. Scan rendered HTML for known description containers
 *  3. og:description meta tag (usually a trimmed version but better than nothing)
 *
 * The ML REST API endpoint GET /items/{id}/description returns 403 for classified
 * items (real estate) without a user access-token, so it is NOT used here.
 */
async function extractMLDescription(url: string, itemId: string): Promise<string> {
  // Build canonical Portal Inmobiliario URL from the item id
  const piUrl = url.includes('portalinmobiliario.com')
    ? url
    : `https://www.portalinmobiliario.com/${itemId}`

  let description = ''

  try {
    const pageRes = await fetch(piUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-CL,es;q=0.9,en;q=0.8',
      },
    })
    if (!pageRes.ok) return description
    const html = await pageRes.text()

    // ── 1. __NEXT_DATA__ ──────────────────────────────────────────────────
    const ndStart = html.indexOf('__NEXT_DATA__')
    if (ndStart !== -1) {
      try {
        const jsonStart = html.indexOf('>', ndStart) + 1
        const jsonEnd   = html.indexOf('</script>', jsonStart)
        const nd = JSON.parse(html.substring(jsonStart, jsonEnd))
        const pp = nd?.props?.pageProps

        // Known paths where Portal Inmobiliario stores the description
        const candidates: unknown[] = [
          pp?.initialState?.descriptionState?.description?.content,
          pp?.initialState?.descriptionState?.description?.text,
          pp?.item?.description,
          pp?.data?.item?.description,
          pp?.data?.description,
          pp?.components?.description?.content,
          pp?.serverData?.description,
          pp?.description,
          // Sometimes nested inside "body" arrays
          ...(Array.isArray(pp?.components?.description?.body)
            ? pp.components.description.body.map((b: any) => b?.text || b?.content || '')
            : []),
        ]

        for (const c of candidates) {
          if (c && typeof c === 'string') {
            const clean = c
              .replace(/<[^>]+>/g, ' ')
              .replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&#39;/g, "'")
              .replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
              .replace(/\s+/g, ' ')
              .trim()
            if (clean.length > description.length) description = clean
          }
        }
      } catch { /* malformed JSON — continue */ }
    }

    // ── 2. Rendered HTML containers ───────────────────────────────────────
    if (description.length < 80) {
      const containerPatterns = [
        // Portal Inmobiliario / ML generic description class
        /class="[^"]*ui-pdp-description[^"]*"[^>]*>([\s\S]{20,4000}?)<\/(?:div|section|article)>/i,
        // MercadoLibre real-estate description block
        /class="[^"]*pdp-description[^"]*"[^>]*>([\s\S]{20,4000}?)<\/(?:div|section)>/i,
        // Generic fallback
        /class="[^"]*description[^-"]*"[^>]*>\s*<p>([\s\S]{20,4000}?)<\/p>/i,
      ]
      for (const pat of containerPatterns) {
        const m = html.match(pat)
        if (m) {
          const clean = m[1]
            .replace(/<[^>]+>/g, ' ')
            .replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&#39;/g, "'")
            .replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
            .replace(/\s+/g, ' ')
            .trim()
          if (clean.length > description.length) { description = clean; break }
        }
      }
    }

    // ── 3. og:description meta tag ────────────────────────────────────────
    if (description.length < 80) {
      const ogM =
        html.match(/<meta[^>]*(?:property|name)=["']og:description["'][^>]*content=["']([^"']{20,})["']/i) ||
        html.match(/<meta[^>]*content=["']([^"']{20,})["'][^>]*(?:property|name)=["']og:description["']/i)
      if (ogM?.[1] && ogM[1].length > description.length) {
        description = ogM[1].replace(/\s+/g, ' ').trim()
      }
    }
  } catch { /* network error — return whatever we have */ }

  return description.substring(0, 3000)
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
  if (text.includes('nave industrial') || text.includes('nave')) return 'nave_industrial'
  if (text.includes('monoambiente') || text.includes('studio')) return 'monoambiente'
  if (text.includes('condominio')) return 'casa_condominio'
  if (text.includes('villa')) return 'villa'
  if (text.includes('quinta')) return 'quinta'
  if (text.includes('departamento') || text.includes('depto') || text.includes('apartment')) return 'departamento'
  if (text.includes('bodega') || text.includes('warehouse')) return 'bodega'
  if (text.includes('hotel')) return 'hotel'
  if (text.includes('edificio') || text.includes('building')) return 'edificio'
  if (text.includes('oficina') || text.includes('office')) return 'oficina'
  if (text.includes('local comercial')) return 'local'
  if (text.includes('local')) return 'local'
  if (text.includes('terreno comercial')) return 'terreno_comercial'
  if (text.includes('terreno') || text.includes('parcela') || text.includes('land')) return 'terreno'
  if (text.includes('casa')) return 'casa'
  return 'departamento'
}

function mapType(type: string): string {
  const map: Record<string, string> = {
    'Departamento': 'departamento',
    'Casa': 'casa',
    'Casa en condominio': 'casa_condominio',
    'Villa': 'villa',
    'Quinta': 'quinta',
    'Monoambiente': 'monoambiente',
    'Terreno': 'terreno',
    'Terreno comercial': 'terreno_comercial',
    'Oficina': 'oficina',
    'Local comercial': 'local',
    'Bodega': 'bodega',
    'Edificio': 'edificio',
    'Hotel': 'hotel',
    'Nave industrial': 'nave_industrial',
    'Parcela': 'terreno',
    'Local': 'local',
  }
  return map[type] || detectPropertyType(type.toLowerCase())
}

function resolveUrl(src: string, baseUrl: string): string {
  if (!src) return ''
  if (src.startsWith('//')) return 'https:' + src
  if (src.startsWith('/')) { try { return new URL(src, baseUrl).href } catch { return '' } }
  if (src.startsWith('http')) return src
  try { return new URL(src, baseUrl).href } catch { return '' }
}

function parseAlterEstateProperty(prop: any) {
  // Extract images from gallery_image array (AlterEstate format)
  const images: string[] = []
  const gallery = prop.gallery_image || prop.images || prop.photos || []
  if (Array.isArray(gallery)) {
    const seenNames = new Set<string>()
    for (const img of gallery) {
      const url = typeof img === 'string' ? img : (img.image || img.url || img.src || '')
      // Use 'name' field to deduplicate (unique per real photo)
      const name = typeof img === 'object' ? (img.name || '') : ''
      // Extract base filename without path prefix to find real duplicates
      const baseName = name.replace(/^properties\/[^/]+\/[^/]+\/[^/]+\//, '')
      if (url && (!baseName || !seenNames.has(baseName))) {
        if (baseName) seenNames.add(baseName)
        images.push(url)
      }
    }
  }

  // Clean HTML from description
  let desc = prop.description || ''
  desc = desc.replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim()

  // Detect operation
  const name = (prop.name || prop.title || '').toLowerCase()
  const listingTypes = prop.listing_type || []
  let operation = 'venta'
  if (name.includes('arriendo') || name.includes('alquiler') || listingTypes.some((l: any) => l.listing === 'Alquiler' || l.listing === 'Rent')) {
    operation = 'arriendo'
  }

  // Detect type from category
  let type = 'departamento'
  const catName = (prop.category?.name || '').toLowerCase()
  if (catName.includes('casa') || catName.includes('house')) type = 'casa'
  else if (catName.includes('oficina') || catName.includes('office')) type = 'oficina'
  else if (catName.includes('local') || catName.includes('commercial')) type = 'local'
  else if (catName.includes('terreno') || catName.includes('land')) type = 'terreno'
  else if (catName.includes('apart') || catName.includes('depart')) type = 'departamento'

  // Currency detection
  let currency = 'CLP'
  const currRent = prop.currency_rent || prop.currency_sale || ''
  if (currRent === 'CLF' || currRent === 'UF') currency = 'UF'
  else if (currRent === 'USD') currency = 'USD'

  // Detect operation from listing_type array (AlterEstate format)
  let finalOperation = operation
  if (listingTypes.some((l: any) =>
    l.listing?.toLowerCase().includes('temporal') ||
    l.listing?.toLowerCase().includes('vacacional')
  )) {
    finalOperation = 'arriendo_temporal'
  }

  return {
    title: prop.name || prop.title || '',
    price: prop.rent_price || prop.sale_price || prop.price || 0,
    currency,
    operation: finalOperation,
    type,
    bedrooms: prop.room || prop.bedroom || prop.bedrooms || 0,
    bathrooms: prop.bathroom || prop.bathrooms || 0,
    half_bathrooms: prop.half_bathroom || prop.half_bathrooms || 0,
    sqm: prop.property_area || prop.total_surface || prop.usable_surface || 0,
    covered_sqm: prop.covered_surface || prop.built_area || prop.covered_area || null,
    terrace_sqm: prop.terrace_area || prop.terrace || null,
    address: prop.address || '',
    city: prop.city || '',
    sector: typeof prop.sector === 'string' ? prop.sector : (prop.sector?.name || prop.commune || ''),
    description: desc.substring(0, 3000),
    images: images.slice(0, 20),
    common_expenses: prop.maintenance_fee || prop.common_expenses || 0,
    pets_allowed: prop.pets_allowed || false,
    parking: prop.parkinglot || prop.parking_lots || prop.parking || 0,
    storage: prop.cellar || prop.warehouse || prop.storage || 0,
    floor_level: prop.floor_level || prop.floor || null,
    floor_count: prop.floors || prop.floor_count || null,
    furnished: prop.furnished || false,
    year_built: prop.year_built || prop.construction_year || null,
    condition: prop.condition || prop.property_condition || '',
    amenities: Array.isArray(prop.amenities) ? prop.amenities.map((a: any) =>
      typeof a === 'string' ? a : (a.name || a.label || '')
    ).filter(Boolean) : [],
  }
}

function deduplicateByFilename(images: string[]): string[] {
  const seen = new Map<string, string>()
  for (const url of images) {
    // Extract the original filename from the URL or base64 key
    const nameMatch = url.match(/\/([^/]+\.jpe?g|[^/]+\.png|[^/]+\.webp)/i)
    const key = nameMatch ? nameMatch[1] : url.substring(url.length - 40)
    if (!seen.has(key)) {
      seen.set(key, url)
    }
  }
  const result: string[] = []
  seen.forEach(v => result.push(v))
  return result
}

function extractJsonObject(text: string, start: number): string | null {
  let depth = 0
  let i = start
  while (i < text.length && i < start + 500000) {
    if (text[i] === '{') depth++
    else if (text[i] === '}') {
      depth--
      if (depth === 0) return text.substring(start, i + 1)
    }
    i++
  }
  return null
}
