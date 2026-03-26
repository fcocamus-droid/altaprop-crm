import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { url } = await request.json()

    if (!url || !url.includes('portalinmobiliario.com')) {
      return NextResponse.json({ error: 'URL de Portal Inmobiliario no válida' }, { status: 400 })
    }

    // Extract the listing ID from the URL (MLC-XXXXXXXXXX)
    const idMatch = url.match(/MLC-?(\d+)/)
    if (!idMatch) {
      return NextResponse.json({ error: 'No se pudo extraer el ID de la publicación' }, { status: 400 })
    }

    const itemId = `MLC${idMatch[1]}`

    // Try MercadoLibre public API first
    let data = null

    // Attempt 1: Items API
    try {
      const res = await fetch(`https://api.mercadolibre.com/items/${itemId}`, {
        headers: { 'Accept': 'application/json' }
      })
      if (res.ok) {
        data = await res.json()
      }
    } catch (e) {}

    // Attempt 2: Try with sites API
    if (!data) {
      try {
        const res = await fetch(`https://api.mercadolibre.com/sites/MLC/search?ids=${itemId}`, {
          headers: { 'Accept': 'application/json' }
        })
        if (res.ok) {
          const searchData = await res.json()
          if (searchData.results?.length > 0) {
            data = searchData.results[0]
          }
        }
      } catch (e) {}
    }

    // If API worked, parse the data
    if (data) {
      const attrs = data.attributes || []
      const getAttr = (id: string) => attrs.find((a: any) => a.id === id)?.value_name || ''

      const result = {
        title: data.title || '',
        price: data.price || 0,
        currency: data.currency_id === 'CLF' ? 'UF' : 'CLP',
        operation: data.title?.toLowerCase().includes('arriendo') ? 'arriendo' : 'venta',
        type: mapPropertyType(getAttr('PROPERTY_TYPE')),
        bedrooms: parseInt(getAttr('BEDROOMS')) || 0,
        bathrooms: parseInt(getAttr('FULL_BATHROOMS') || getAttr('BATHROOMS')) || 0,
        sqm: parseFloat(getAttr('COVERED_AREA') || getAttr('TOTAL_AREA')) || 0,
        address: data.location?.address_line || '',
        city: data.location?.city?.name || '',
        sector: data.location?.neighborhood?.name || '',
        description: '',
        images: (data.pictures || []).map((p: any) => p.secure_url || p.url),
      }

      // Get description separately
      try {
        const descRes = await fetch(`https://api.mercadolibre.com/items/${itemId}/description`)
        if (descRes.ok) {
          const descData = await descRes.json()
          result.description = descData.plain_text || descData.text || ''
        }
      } catch (e) {}

      return NextResponse.json(result)
    }

    // If APIs don't work, return instruction for client-side scraping
    return NextResponse.json({
      fallback: true,
      message: 'API no disponible, usa extracción manual'
    })

  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error al procesar' }, { status: 500 })
  }
}

function mapPropertyType(type: string): string {
  const map: Record<string, string> = {
    'Departamento': 'departamento',
    'Casa': 'casa',
    'Oficina': 'oficina',
    'Local comercial': 'local',
    'Terreno': 'terreno',
    'Parcela': 'terreno',
  }
  return map[type] || 'departamento'
}
