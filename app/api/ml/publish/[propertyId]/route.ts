import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  refreshTokenIfNeeded,
  publishProperty,
  updateProperty,
  pauseProperty,
  reactivateProperty,
  deleteProperty,
} from '@/lib/ml/client'

type RouteParams = { params: { propertyId: string } }

// ─── GET: Return current ML status for a property ────────────────────────────

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const admin = createAdminClient()
    const { data: property, error } = await admin
      .from('properties')
      .select('id, ml_item_id, ml_status, ml_listing_type, ml_published_at, ml_poi_visible')
      .eq('id', params.propertyId)
      .single()

    if (error || !property) {
      return NextResponse.json({ error: 'Propiedad no encontrada' }, { status: 404 })
    }

    return NextResponse.json({
      ml_item_id: property.ml_item_id,
      ml_status: property.ml_status,
      ml_listing_type: property.ml_listing_type,
      ml_published_at: property.ml_published_at,
      ml_poi_visible: property.ml_poi_visible,
    })
  } catch (err) {
    console.error('ML GET status error:', err)
    return NextResponse.json({ error: 'Error inesperado' }, { status: 500 })
  }
}

// ─── POST: Publish property to ML ────────────────────────────────────────────

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const listingType: string = body.listing_type || 'silver'

    const admin = createAdminClient()

    // Fetch the property with images
    const { data: property, error: propError } = await admin
      .from('properties')
      .select('*, images:property_images(*)')
      .eq('id', params.propertyId)
      .single()

    if (propError || !property) {
      return NextResponse.json({ error: 'Propiedad no encontrada' }, { status: 404 })
    }

    // Determine whose ML tokens to use: subscriber's profile
    const subscriberId = property.subscriber_id
    if (!subscriberId) {
      return NextResponse.json({ error: 'La propiedad no tiene suscriptor asignado' }, { status: 400 })
    }

    const { data: subscriberProfile, error: profileError } = await admin
      .from('profiles')
      .select('id, ml_access_token, ml_refresh_token, ml_token_expires_at')
      .eq('id', subscriberId)
      .single()

    if (profileError || !subscriberProfile) {
      return NextResponse.json({ error: 'Perfil del suscriptor no encontrado' }, { status: 404 })
    }

    if (!subscriberProfile.ml_access_token) {
      return NextResponse.json({ error: 'El suscriptor no ha conectado su cuenta de MercadoLibre' }, { status: 400 })
    }

    // Refresh token if needed
    const accessToken = await refreshTokenIfNeeded(
      subscriberProfile,
      async (tokens) => {
        await admin
          .from('profiles')
          .update({
            ml_access_token: tokens.ml_access_token,
            ml_refresh_token: tokens.ml_refresh_token,
            ml_token_expires_at: tokens.ml_token_expires_at,
          })
          .eq('id', subscriberId)
      }
    )

    // Map property images
    const images = (property.images || []).map((img: { url: string }) => ({ url: img.url }))

    const mlPropertyData = {
      id: property.id,
      title: property.title,
      description: property.description,
      type: property.type,
      operation: property.operation,
      price: property.price,
      currency: property.currency,
      address: property.address,
      city: property.city,
      sector: property.sector,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      parking: property.parking,
      total_area: property.sqm,
      covered_area: property.covered_area ?? property.sqm,
      images,
      ml_listing_type: listingType,
    }

    const result = await publishProperty(accessToken, mlPropertyData)

    // Save ML item ID and status to the property
    await admin
      .from('properties')
      .update({
        ml_item_id: result.id,
        ml_status: result.status || 'active',
        ml_listing_type: listingType,
        ml_published_at: new Date().toISOString(),
        ml_poi_visible: true,
      })
      .eq('id', params.propertyId)

    return NextResponse.json({
      success: true,
      ml_item_id: result.id,
      ml_status: result.status,
      permalink: result.permalink,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error inesperado'
    console.error('ML publish error:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// ─── PUT: Update existing ML listing ─────────────────────────────────────────

export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const action: string = body.action || 'update' // 'update' | 'pause' | 'reactivate'

    const admin = createAdminClient()

    const { data: property, error: propError } = await admin
      .from('properties')
      .select('*, images:property_images(*)')
      .eq('id', params.propertyId)
      .single()

    if (propError || !property) {
      return NextResponse.json({ error: 'Propiedad no encontrada' }, { status: 404 })
    }

    if (!property.ml_item_id) {
      return NextResponse.json({ error: 'La propiedad no está publicada en ML' }, { status: 400 })
    }

    const subscriberId = property.subscriber_id
    if (!subscriberId) {
      return NextResponse.json({ error: 'La propiedad no tiene suscriptor asignado' }, { status: 400 })
    }

    const { data: subscriberProfile } = await admin
      .from('profiles')
      .select('id, ml_access_token, ml_refresh_token, ml_token_expires_at')
      .eq('id', subscriberId)
      .single()

    if (!subscriberProfile?.ml_access_token) {
      return NextResponse.json({ error: 'El suscriptor no tiene cuenta ML conectada' }, { status: 400 })
    }

    const accessToken = await refreshTokenIfNeeded(
      subscriberProfile,
      async (tokens) => {
        await admin
          .from('profiles')
          .update({
            ml_access_token: tokens.ml_access_token,
            ml_refresh_token: tokens.ml_refresh_token,
            ml_token_expires_at: tokens.ml_token_expires_at,
          })
          .eq('id', subscriberId)
      }
    )

    if (action === 'pause') {
      await pauseProperty(accessToken, property.ml_item_id)
      await admin
        .from('properties')
        .update({ ml_status: 'paused' })
        .eq('id', params.propertyId)
      return NextResponse.json({ success: true, ml_status: 'paused' })
    }

    if (action === 'reactivate') {
      await reactivateProperty(accessToken, property.ml_item_id)
      await admin
        .from('properties')
        .update({ ml_status: 'active' })
        .eq('id', params.propertyId)
      return NextResponse.json({ success: true, ml_status: 'active' })
    }

    // Default: update listing data
    const images = (property.images || []).map((img: { url: string }) => ({ url: img.url }))
    const mlPropertyData = {
      id: property.id,
      title: property.title,
      description: property.description,
      type: property.type,
      operation: property.operation,
      price: property.price,
      currency: property.currency,
      address: property.address,
      city: property.city,
      sector: property.sector,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      parking: property.parking,
      total_area: property.sqm,
      covered_area: property.covered_area ?? property.sqm,
      images,
    }

    const result = await updateProperty(accessToken, property.ml_item_id, mlPropertyData)
    return NextResponse.json({ success: true, ml_status: result.status })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error inesperado'
    console.error('ML update error:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// ─── DELETE: Close ML listing ─────────────────────────────────────────────────


export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const admin = createAdminClient()

    const { data: property, error: propError } = await admin
      .from('properties')
      .select('id, ml_item_id, subscriber_id')
      .eq('id', params.propertyId)
      .single()

    if (propError || !property) {
      return NextResponse.json({ error: 'Propiedad no encontrada' }, { status: 404 })
    }

    if (!property.ml_item_id) {
      return NextResponse.json({ error: 'La propiedad no está publicada en ML' }, { status: 400 })
    }

    const subscriberId = property.subscriber_id
    if (!subscriberId) {
      return NextResponse.json({ error: 'La propiedad no tiene suscriptor asignado' }, { status: 400 })
    }

    const { data: subscriberProfile } = await admin
      .from('profiles')
      .select('id, ml_access_token, ml_refresh_token, ml_token_expires_at')
      .eq('id', subscriberId)
      .single()

    if (!subscriberProfile?.ml_access_token) {
      return NextResponse.json({ error: 'El suscriptor no tiene cuenta ML conectada' }, { status: 400 })
    }

    const accessToken = await refreshTokenIfNeeded(
      subscriberProfile,
      async (tokens) => {
        await admin
          .from('profiles')
          .update({
            ml_access_token: tokens.ml_access_token,
            ml_refresh_token: tokens.ml_refresh_token,
            ml_token_expires_at: tokens.ml_token_expires_at,
          })
          .eq('id', subscriberId)
      }
    )

    await deleteProperty(accessToken, property.ml_item_id)

    await admin
      .from('properties')
      .update({ ml_status: 'closed', ml_item_id: null })
      .eq('id', params.propertyId)

    return NextResponse.json({ success: true, ml_status: 'closed' })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error inesperado'
    console.error('ML delete error:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
