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

const ML_CATEGORY_MAP: Record<string, string> = {
  'arriendo_departamento': 'MLC157520',
  'arriendo_casa': 'MLC157519',
  'venta_departamento': 'MLC157521',
  'venta_casa': 'MLC157518',
  'arriendo_oficina': 'MLC157526',
  'venta_oficina': 'MLC157527',
}

function getCategoryId(operation: string, type: string): string {
  const key = `${operation.toLowerCase()}_${type.toLowerCase()}`
  return ML_CATEGORY_MAP[key] || 'MLC157520'
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

  const attributes: Array<{ id: string; value_name?: string; value_struct?: { number: number; unit: string } }> = [
    // Portal Inmobiliario cross-posting
    { id: 'CMG_SITE', value_name: 'POI' },
  ]

  if (property.bedrooms != null) {
    attributes.push({ id: 'BEDROOMS', value_struct: { number: property.bedrooms, unit: 'unit' } })
  }
  if (property.bathrooms != null) {
    attributes.push({ id: 'FULL_BATHROOMS', value_struct: { number: property.bathrooms, unit: 'unit' } })
  }
  if (property.parking != null && property.parking > 0) {
    attributes.push({ id: 'PARKING_LOTS', value_struct: { number: property.parking, unit: 'unit' } })
  }
  if (property.total_area != null) {
    attributes.push({ id: 'TOTAL_AREA', value_struct: { number: property.total_area, unit: 'm²' } })
  }
  if (property.covered_area != null) {
    attributes.push({ id: 'COVERED_AREA', value_struct: { number: property.covered_area, unit: 'm²' } })
  }

  const locationParts = [property.address, property.sector, property.city].filter(Boolean)

  const payload: Record<string, unknown> = {
    title: property.title,
    category_id: categoryId,
    price: property.price,
    currency_id: currencyId,
    available_quantity: 1,
    buying_mode: 'classified',
    listing_type_id: listingTypeId,
    condition: 'not_specified',
    attributes,
  }

  if (locationParts.length > 0) {
    payload.location = { address_line: locationParts.join(', ') }
  }

  if (pictures.length > 0) {
    payload.pictures = pictures
  }

  if (property.description) {
    payload.description = { plain_text: property.description }
  }

  return payload
}

// ─── API calls ────────────────────────────────────────────────────────────────

export async function publishProperty(
  accessToken: string,
  propertyData: MLProperty
): Promise<{ id: string; permalink: string; status: string }> {
  const payload = buildMLPayload(propertyData)

  const res = await fetch(`${ML_API}/items`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`ML publish failed (${res.status}): ${err}`)
  }

  return res.json()
}

export async function updateProperty(
  accessToken: string,
  mlItemId: string,
  propertyData: Partial<MLProperty>
): Promise<{ id: string; status: string }> {
  // Build partial update payload (exclude listing_type_id and category_id from updates)
  const updates: Record<string, unknown> = {}

  if (propertyData.title) updates.title = propertyData.title
  if (propertyData.price != null) updates.price = propertyData.price
  if (propertyData.currency) updates.currency_id = propertyData.currency === 'UF' ? 'CLF' : 'CLP'

  if (propertyData.images) {
    const pictures = propertyData.images
      .filter(img => img.url)
      .map(img => ({ source: img.url }))
    if (pictures.length > 0) updates.pictures = pictures
  }

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
