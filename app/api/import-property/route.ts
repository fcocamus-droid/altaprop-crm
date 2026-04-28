import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getUserProfile } from '@/lib/auth'
import { ROLES } from '@/lib/constants'

// Same-origin only — was previously '*' and unauthenticated, allowing anyone
// on the internet to spam-create properties under the first SUPERADMIN found.
const cors = {
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    // Require an authenticated manager. The previous fallback to "first
    // SUPERADMIN found" was an open-property-creation hole.
    const profile = await getUserProfile()
    if (!profile) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401, headers: cors })
    }
    const allowedRoles: string[] = [ROLES.SUPERADMINBOSS, ROLES.SUPERADMIN, ROLES.AGENTE]
    if (!allowedRoles.includes(profile.role)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403, headers: cors })
    }

    const data = await request.json()

    if (!data.title) {
      return NextResponse.json({ error: 'Título requerido' }, { status: 400, headers: cors })
    }

    // Owner is always the calling user (or, for agents, the user they pick
    // explicitly). No more "fallback to first SUPERADMIN" magic.
    const ownerId = profile.id

    // Insert property
    const { data: property, error: propError } = await supabase
      .from('properties')
      .insert({
        owner_id: ownerId,
        title: data.title,
        description: data.description || '',
        type: data.type || 'departamento',
        operation: data.operation || 'arriendo',
        price: data.price || 0,
        currency: data.currency || 'CLP',
        address: data.address || '',
        city: data.city || '',
        sector: data.sector || '',
        bedrooms: data.bedrooms || 0,
        bathrooms: data.bathrooms || 0,
        sqm: data.sqm || 0,
        status: 'available',
        featured: false,
      })
      .select('id')
      .single()

    if (propError) {
      return NextResponse.json({ error: propError.message }, { status: 500, headers: cors })
    }

    // Insert images
    if (data.images?.length > 0) {
      await supabase.from('property_images').insert(
        data.images.slice(0, 20).map((url: string, i: number) => ({
          property_id: property.id, url, order: i,
        }))
      )
    }

    return NextResponse.json({ success: true, propertyId: property.id }, { headers: cors })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500, headers: cors })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: cors })
}
