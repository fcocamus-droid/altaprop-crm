/**
 * MercadoLibre API client helpers
 * Publishing with attribute CMG_SITE: POI also publishes to Portal Inmobiliario.
 */

const ML_API = 'https://api.mercadolibre.com'
const ML_TOKEN_URL = `${ML_API}/oauth/token`

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MLProfile {
  id: string
  ml_access_token: string | null
  ml_refresh_token: string | null
  ml_token_expires_at: string | null
}

export interface MLTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  scope: string
  user_id: number
  refresh_token: string
}

export interface MLUserInfo {
  id: number
  nickname: string
  email: string
}

export interface MLProperty {
  id: string
  title: string
  description: string | null
  type: string
  operation: string
  price: number
  currency: string
  address: string | null
  city: string | null
  sector: string | null
  bedrooms: number | null
  bathrooms: number | null
  parking: number | null
  total_area: number | null
  covered_area: number | null
  images?: Array<{ url: string }>
  ml_listing_type?: string | null
}

// ─── Category mapping ─────────────────────────────────────────────────────────

// Category IDs verified from GET https://api.mercadolibre.com/categories/{id} (MLC = Chile)
// Residential & office categories have a 3rd level: "Propiedades usadas" (existing) vs "Proyectos" (new construction).
// We default to "Propiedades usadas" since the CRM publishes existing properties.
const ML_CATEGORY_MAP: Record<string, string> = {
  // ── Departamentos → leaf "Propiedades usadas" ────────────────────────────────
  'arriendo_departamento':             'MLC183186', // Deptos > Arriendo > Prop. usadas
  'arriendo_temporal_departamento':    'MLC116367',  // Deptos > Arriendo Temporal (leaf)
  'venta_departamento':                'MLC157522',  // Deptos > Venta > Prop. usadas
  // Monoambiente → departamento
  'arriendo_monoambiente':             'MLC183186',
  'arriendo_temporal_monoambiente':    'MLC116367',
  'venta_monoambiente':                'MLC157522',
  // ── Casas → leaf "Propiedades usadas" ───────────────────────────────────────
  'arriendo_casa':                     'MLC183184',  // Casas > Arriendo > Prop. usadas
  'arriendo_temporal_casa':            'MLC116364',  // Casas > Arriendo Temporal (leaf)
  'venta_casa':                        'MLC157520',  // Casas > Venta > Prop. usadas
  // Casa en condominio, villa, quinta → casa
  'arriendo_casa_condominio':          'MLC183184',
  'arriendo_temporal_casa_condominio': 'MLC116364',
  'venta_casa_condominio':             'MLC157520',
  'arriendo_villa':                    'MLC183184',
  'arriendo_temporal_villa':           'MLC116364',
  'venta_villa':                       'MLC157520',
  'arriendo_quinta':                   'MLC183184',
  'arriendo_temporal_quinta':          'MLC116364',
  'venta_quinta':                      'MLC157520',
  // ── Oficinas → leaf "Propiedades usadas" ────────────────────────────────────
  'arriendo_oficina':                  'MLC183187',  // Oficinas > Arriendo > Prop. usadas
  'venta_oficina':                     'MLC157413',  // Oficinas > Venta > Prop. usadas
  // ── Locales comerciales (leaf, no sub-levels) ────────────────────────────────
  'arriendo_local':                    'MLC50611',
  'venta_local':                       'MLC50612',
  // Edificio y hotel → local comercial
  'arriendo_edificio':                 'MLC50611',
  'venta_edificio':                    'MLC50612',
  'arriendo_hotel':                    'MLC50611',
  'venta_hotel':                       'MLC50612',
  // ── Terrenos (leaf) ──────────────────────────────────────────────────────────
  'arriendo_terreno':                  'MLC152994',
  'venta_terreno':                     'MLC152993',
  // ── Bodegas (leaf) ───────────────────────────────────────────────────────────
  'arriendo_bodega':                   'MLC50565',
  'venta_bodega':                      'MLC50566',
  // ── Industriales / Naves (leaf) ──────────────────────────────────────────────
  'arriendo_nave_industrial':          'MLC50618',
  'venta_nave_industrial':             'MLC50619',
  // ── Estacionamientos (leaf) ──────────────────────────────────────────────────
  'arriendo_estacionamiento':          'MLC50621',
  'venta_estacionamiento':             'MLC50622',
}

function getCategoryId(operation: string, type: string): string {
  const op  = operation.toLowerCase().trim()
  const typ = type.toLowerCase().trim().replace(/\s+/g, '_')

  // Direct match (includes arriendo_temporal_*)
  const key = `${op}_${typ}`
  if (ML_CATEGORY_MAP[key]) return ML_CATEGORY_MAP[key]

  // If arriendo_temporal has no specific match, fall back to arriendo
  const fallbackOp = op === 'arriendo_temporal' ? 'arriendo' : op
  const fallbackKey = `${fallbackOp}_${typ}`
  if (ML_CATEGORY_MAP[fallbackKey]) return ML_CATEGORY_MAP[fallbackKey]

  // Partial type match (e.g. "local_comercial" → "local")
  for (const [mapKey, catId] of Object.entries(ML_CATEGORY_MAP)) {
    const prefix = `${fallbackOp}_`
    if (mapKey.startsWith(prefix) && typ.startsWith(mapKey.slice(prefix.length))) return catId
  }

  // Default: arriendo departamento
  return 'MLC6407'
}

// ─── Chilean commune → ML city ID map ────────────────────────────────────────
// IDs obtained from GET https://api.mercadolibre.com/states/{state_id}

export const ML_CITY_MAP: Record<string, { cityId: string; stateId: string }> = {
  // RM – Región Metropolitana
  'providencia':          { cityId: 'TUxDQ1BST2NhYjU3', stateId: 'CL-RM' },
  'las condes':           { cityId: 'TUxDQ0xBUzU2MTEz', stateId: 'CL-RM' },
  'santiago':             { cityId: 'TUxDQ1NBTjk4M2M',  stateId: 'CL-RM' },
  'vitacura':             { cityId: 'TUxDQ1ZJVDM2MjFj', stateId: 'CL-RM' },
  'ñuñoa':                { cityId: 'TUxDQ9FV0WU0MmM2', stateId: 'CL-RM' },
  'nunoa':                { cityId: 'TUxDQ9FV0WU0MmM2', stateId: 'CL-RM' },
  'la florida':           { cityId: 'TUxDQ0xBIGM5NzMz', stateId: 'CL-RM' },
  'la reina':             { cityId: 'TUxDQ0xBIDZlMWI5', stateId: 'CL-RM' },
  'maipu':                { cityId: 'TUxDQ01BSWI5Y2M2', stateId: 'CL-RM' },
  'maipú':                { cityId: 'TUxDQ01BSWI5Y2M2', stateId: 'CL-RM' },
  'pudahuel':             { cityId: 'TUxDQ1BVRDg4OWIx', stateId: 'CL-RM' },
  'san miguel':           { cityId: 'TUxDQ1NBTjcwNDU0', stateId: 'CL-RM' },
  'colina':               { cityId: 'TUxDQ0NPTGNkMWZj', stateId: 'CL-RM' },
  'quilicura':            { cityId: 'TUxDQ1FVSTY5YTdl', stateId: 'CL-RM' },
  'puente alto':          { cityId: 'TUxDQ1BVRTZmOGZl', stateId: 'CL-RM' },
  'lo barnechea':         { cityId: 'TUxDQ0xPIGUzZDM3', stateId: 'CL-RM' },
  'huechuraba':           { cityId: 'TUxDQ0hVRTdmZjlm', stateId: 'CL-RM' },
  'recoleta':             { cityId: 'TUxDQ1JFQzY4YjIw', stateId: 'CL-RM' },
  'independencia':        { cityId: 'TUxDQ0lORDIxMmU0', stateId: 'CL-RM' },
  'macul':                { cityId: 'TUxDQ01BQzY4NTYx', stateId: 'CL-RM' },
  'peñalolen':            { cityId: 'TUxDQ1BF0TRkNzFj', stateId: 'CL-RM' },
  'peñalolén':            { cityId: 'TUxDQ1BF0TRkNzFj', stateId: 'CL-RM' },
  'la granja':            { cityId: 'TUxDQ0xBIGZjNGI',  stateId: 'CL-RM' },
  'el bosque':            { cityId: 'TUxDQ0VMIDU0OTE',  stateId: 'CL-RM' },
  'san bernardo':         { cityId: 'TUxDQ1NBTmIyZDBh', stateId: 'CL-RM' },
  'cerrillos':            { cityId: 'TUxDQ0NFUjFjYjRk', stateId: 'CL-RM' },
  'lo prado':             { cityId: 'TUxDQ0xPIGFkMzA4', stateId: 'CL-RM' },
  'lo espejo':            { cityId: 'TUxDQ0xPIDcwY2Ew', stateId: 'CL-RM' },
  'renca':                { cityId: 'TUxDQ1JFTjI5MWQ0', stateId: 'CL-RM' },
  'cerro navia':          { cityId: 'TUxDQ0NFUmQxZWJk', stateId: 'CL-RM' },
  'conchali':             { cityId: 'TUxDQ0NPTjFkMmI2', stateId: 'CL-RM' },
  'conchalí':             { cityId: 'TUxDQ0NPTjFkMmI2', stateId: 'CL-RM' },
  'pedro aguirre cerda':  { cityId: 'TUxDQ1BFRGVjZDNm', stateId: 'CL-RM' },
  'penaflor':             { cityId: 'TUxDQ1BF0TkzM2Fh', stateId: 'CL-RM' },
  'peñaflor':             { cityId: 'TUxDQ1BF0TkzM2Fh', stateId: 'CL-RM' },
  'la pintana':           { cityId: 'TUxDQ0xBIDIxOWE1', stateId: 'CL-RM' },
  'la cisterna':          { cityId: 'TUxDQ0xBIGFhMjBk', stateId: 'CL-RM' },
  'san ramon':            { cityId: 'TUxDQ1NBTjk1ZmNj', stateId: 'CL-RM' },
  'san ramón':            { cityId: 'TUxDQ1NBTjk1ZmNj', stateId: 'CL-RM' },
  'san joaquin':          { cityId: 'TUxDQ1NBTjk2NjA0', stateId: 'CL-RM' },
  'san joaquín':          { cityId: 'TUxDQ1NBTjk2NjA0', stateId: 'CL-RM' },
  'estacion central':     { cityId: 'TUxDQ0VTVDY1ODUw', stateId: 'CL-RM' },
  'estación central':     { cityId: 'TUxDQ0VTVDY1ODUw', stateId: 'CL-RM' },
  'buin':                 { cityId: 'TUxDQ0JVSTc4MWEw', stateId: 'CL-RM' },
  'lampa':                { cityId: 'TUxDQ0xBTTk2M2Rj', stateId: 'CL-RM' },
  'melipilla':            { cityId: 'TUxDQ01FTGI4Yzli', stateId: 'CL-RM' },
  'talagante':            { cityId: 'TUxDQ1RBTDgxMDU1', stateId: 'CL-RM' },
}

function resolveMLLocation(
  city: string | null,
  sector: string | null
): { cityId: string; stateId: string } | null {
  // Try sector first (commune), then city — normalize to lowercase
  const candidates = [sector, city].filter(Boolean).map(s => s!.toLowerCase().trim())
  for (const name of candidates) {
    if (ML_CITY_MAP[name]) return ML_CITY_MAP[name]
    // Try without accents as extra fallback
    const noAccents = name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
    if (ML_CITY_MAP[noAccents]) return ML_CITY_MAP[noAccents]
  }
  return null
}

// ─── Token refresh ────────────────────────────────────────────────────────────

/**
 * Refreshes the ML access token if it has expired or expires within the next 5 minutes.
 * Returns the (potentially updated) access token and saves the new tokens via the
 * provided save callback if a refresh happened.
 */
export async function refreshTokenIfNeeded(
  profile: MLProfile,
  saveTokens: (tokens: { ml_access_token: string; ml_refresh_token: string; ml_token_expires_at: string }) => Promise<void>
): Promise<string> {
  if (!profile.ml_access_token) throw new Error('No ML access token on profile')
  if (!profile.ml_refresh_token) return profile.ml_access_token

  // Check if token expires within the next 5 minutes
  const expiresAt = profile.ml_token_expires_at ? new Date(profile.ml_token_expires_at) : null
  const now = new Date()
  const fiveMinutes = 5 * 60 * 1000

  if (expiresAt && expiresAt.getTime() - now.getTime() > fiveMinutes) {
    // Token is still valid
    return profile.ml_access_token
  }

  // Refresh the token
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: process.env.ML_CLIENT_ID!,
    client_secret: process.env.ML_CLIENT_SECRET!,
    refresh_token: profile.ml_refresh_token,
  })

  const res = await fetch(ML_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: params.toString(),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`ML token refresh failed: ${err}`)
  }

  const data: MLTokenResponse = await res.json()
  const newExpiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString()

  await saveTokens({
    ml_access_token: data.access_token,
    ml_refresh_token: data.refresh_token,
    ml_token_expires_at: newExpiresAt,
  })

  return data.access_token
}

// ─── Payload builder ──────────────────────────────────────────────────────────

export function buildMLPayload(property: MLProperty): Record<string, unknown> {
  const categoryId = getCategoryId(property.operation, property.type)
  const currencyId = property.currency === 'UF' ? 'CLF' : 'CLP'
  const listingTypeId = property.ml_listing_type || 'silver'

  const pictures = (property.images || [])
    .filter(img => img.url)
    .map(img => ({ source: img.url }))

  // Derive sensible defaults for required project-level attributes
  const addressDisplay = [property.address, property.sector].filter(Boolean).join(', ')
  const developmentName = (addressDisplay || property.title).slice(0, 80)
  const propertyCode = property.id.slice(0, 36)
  const modelName = property.title.slice(0, 60)
  const unitName = property.id.slice(-6)

  const attributes: Array<{
    id: string
    value_name?: string
    value_id?: string
    value_struct?: { number: number; unit: string }
  }> = [
    // Portal Inmobiliario cross-posting
    { id: 'CMG_SITE', value_name: 'POI' },

    // Required project-level attributes (MLC classified real estate)
    { id: 'PROPERTY_CODE',    value_name: propertyCode },
    { id: 'MODEL_NAME',       value_name: modelName },
    { id: 'DEVELOPMENT_NAME', value_name: developmentName },
    { id: 'UNIT_NAME',        value_name: unitName },
    // POSSESSION_STATUS: "Entrega inmediata" (id 242413)
    { id: 'POSSESSION_STATUS', value_id: '242413', value_name: 'Entrega inmediata' },
    // FACING intentionally omitted — optional attribute; CRM does not capture orientation
  ]

  // Numeric attributes — value_name as string for value_type:"number"
  if (property.bedrooms != null) {
    attributes.push({ id: 'BEDROOMS', value_name: String(property.bedrooms) })
  }
  if (property.bathrooms != null) {
    attributes.push({ id: 'FULL_BATHROOMS', value_name: String(property.bathrooms) })
  }
  // PARKING_LOTS is required; "Si no tiene estacionamientos, indica 0"
  attributes.push({ id: 'PARKING_LOTS', value_name: String(property.parking ?? 0) })

  // Area attributes — value_type is "number_unit", ML requires value_struct format.
  // Use cross-fallbacks so all three are always sent when any area value exists.
  const effectiveTotalArea   = property.total_area   ?? property.covered_area
  const effectiveCoveredArea = property.covered_area ?? property.total_area

  if (effectiveTotalArea != null) {
    const n = Math.round(Number(effectiveTotalArea))
    attributes.push({ id: 'TOTAL_AREA',  value_struct: { number: n, unit: 'm²' } })
    // LAND_AREA required — for apartments/offices use total_area as proxy
    attributes.push({ id: 'LAND_AREA',   value_struct: { number: n, unit: 'm²' } })
  }
  if (effectiveCoveredArea != null) {
    attributes.push({ id: 'COVERED_AREA', value_struct: { number: Math.round(Number(effectiveCoveredArea)), unit: 'm²' } })
  }

  // ─── Location ──────────────────────────────────────────────────────────────
  const locationParts = [property.address, property.sector, property.city].filter(Boolean)
  const mlLocation = resolveMLLocation(property.city, property.sector)

  const payload: Record<string, unknown> = {
    title: property.title,
    category_id: categoryId,
    price: property.price,
    currency_id: currencyId,
    available_quantity: 1,
    buying_mode: 'classified',
    listing_type_id: listingTypeId,
    // MLC157521 and all classified real-estate categories only accept 'new'
    condition: 'new',
    attributes,
  }

  if (locationParts.length > 0) {
    if (mlLocation) {
      payload.location = {
        address_line: locationParts.join(', '),
        city:    { id: mlLocation.cityId },
        state:   { id: mlLocation.stateId },
        country: { id: 'CL' },
      }
    } else {
      // Fallback: address_line only (may still fail geo validation for unknown communes)
      payload.location = { address_line: locationParts.join(', ') }
    }
  }

  if (pictures.length > 0) {
    payload.pictures = pictures
  }

  if (property.description) {
    payload.description = { plain_text: property.description }
  }

  return payload
}

// ─── Picture pre-upload ───────────────────────────────────────────────────────

/**
 * Uploads a single image URL to ML's picture API.
 * Returns the ML picture ID (e.g. "MLC-123456789-1234") or null on failure.
 * ML requires pictures to be uploaded before item creation for reliable processing.
 */
async function uploadPictureToML(
  accessToken: string,
  imageUrl: string
): Promise<string | null> {
  try {
    const res = await fetch(
      `${ML_API}/pictures?source=${encodeURIComponent(imageUrl)}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    )
    if (!res.ok) return null
    const data = await res.json()
    return data?.id ?? null
  } catch {
    return null
  }
}

/**
 * Pre-uploads all property images to ML in parallel and returns ML picture ID objects.
 * Falls back to source URLs for any images that fail to upload.
 * Caps at 24 images (ML Chile limit is 30; we leave a buffer).
 */
async function prepareMLPictures(
  accessToken: string,
  images: Array<{ url: string }>
): Promise<Array<Record<string, string>>> {
  const MAX_PICTURES = 24
  const validImages = images.filter(img => img.url).slice(0, MAX_PICTURES)

  // Upload all images in parallel to avoid sequential timeout on large sets
  const results: Array<Record<string, string>> = await Promise.all(
    validImages.map(async (img): Promise<Record<string, string>> => {
      const mlPictureId = await uploadPictureToML(accessToken, img.url)
      return mlPictureId
        ? { id: mlPictureId }
        : { source: img.url } // fallback: ML fetches URL directly
    })
  )

  return results
}

// ─── API calls ────────────────────────────────────────────────────────────────

export async function publishProperty(
  accessToken: string,
  propertyData: MLProperty
): Promise<{ id: string; permalink: string; status: string }> {
  const payload = buildMLPayload(propertyData)

  // Pre-upload images to ML so they're hosted on ML servers before the item is created.
  // This avoids the "processing-image" placeholder caused by ML failing to fetch
  // images from Supabase storage URLs during item creation.
  if (propertyData.images && propertyData.images.length > 0) {
    const mlPictures = await prepareMLPictures(accessToken, propertyData.images)
    if (mlPictures.length > 0) {
      payload.pictures = mlPictures
    }
  }

  const res = await fetch(`${ML_API}/items`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const data = await res.json()

  // ML may return HTTP 402 (Payment Required) but still create the item.
  // If the response contains an `id`, the item was created — treat as success
  // with status "payment_required" so the UI can guide the user to activate.
  if (!res.ok) {
    if (data?.id) {
      return {
        id: data.id,
        permalink: data.permalink || '',
        status: data.status || 'payment_required',
      }
    }
    throw new Error(`ML publish failed (${res.status}): ${JSON.stringify(data)}`)
  }

  return { id: data.id, permalink: data.permalink || '', status: data.status || 'active' }
}

export async function updateProperty(
  accessToken: string,
  mlItemId: string,
  propertyData: Partial<MLProperty>
): Promise<{ id: string; status: string }> {
  // Build partial update payload (exclude listing_type_id and category_id — immutable after publish)
  const updates: Record<string, unknown> = {}

  if (propertyData.title) updates.title = propertyData.title
  if (propertyData.price != null) updates.price = propertyData.price
  if (propertyData.currency) updates.currency_id = propertyData.currency === 'UF' ? 'CLF' : 'CLP'

  if (propertyData.description) {
    updates.description = { plain_text: propertyData.description }
  }

  if (propertyData.images && propertyData.images.length > 0) {
    const mlPictures = await prepareMLPictures(accessToken, propertyData.images)
    if (mlPictures.length > 0) updates.pictures = mlPictures
  }

  // Update mutable attributes (bedrooms, bathrooms, area, parking)
  const attributes: Array<{ id: string; value_name?: string; value_struct?: { number: number; unit: string } }> = []
  if (propertyData.bedrooms != null) {
    attributes.push({ id: 'BEDROOMS', value_name: String(propertyData.bedrooms) })
  }
  if (propertyData.bathrooms != null) {
    attributes.push({ id: 'FULL_BATHROOMS', value_name: String(propertyData.bathrooms) })
  }
  if (propertyData.parking != null) {
    attributes.push({ id: 'PARKING_LOTS', value_name: String(propertyData.parking) })
  }
  if (propertyData.total_area != null) {
    const n = Math.round(Number(propertyData.total_area))
    attributes.push({ id: 'TOTAL_AREA', value_struct: { number: n, unit: 'm²' } })
    attributes.push({ id: 'LAND_AREA',  value_struct: { number: n, unit: 'm²' } })
  }
  if (propertyData.covered_area != null) {
    attributes.push({ id: 'COVERED_AREA', value_struct: { number: Math.round(Number(propertyData.covered_area)), unit: 'm²' } })
  }
  if (attributes.length > 0) updates.attributes = attributes

  const res = await fetch(`${ML_API}/items/${mlItemId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`ML update failed (${res.status}): ${err}`)
  }

  return res.json()
}

export async function pauseProperty(
  accessToken: string,
  mlItemId: string
): Promise<void> {
  const res = await fetch(`${ML_API}/items/${mlItemId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status: 'paused' }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`ML pause failed (${res.status}): ${err}`)
  }
}

export async function reactivateProperty(
  accessToken: string,
  mlItemId: string
): Promise<void> {
  const res = await fetch(`${ML_API}/items/${mlItemId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status: 'active' }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`ML reactivate failed (${res.status}): ${err}`)
  }
}

export async function deleteProperty(
  accessToken: string,
  mlItemId: string
): Promise<void> {
  const res = await fetch(`${ML_API}/items/${mlItemId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status: 'closed' }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`ML close failed (${res.status}): ${err}`)
  }
}
