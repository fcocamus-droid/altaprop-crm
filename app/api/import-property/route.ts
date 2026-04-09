import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const data = await request.json()

    if (!data.title) {
      return NextResponse.json({ error: 'Título requerido' }, { status: 400, headers: cors })
    }

    // Get owner from auth or fallback to SUPERADMIN
    let ownerId: string | null = null
    const authHeader = request.headers.get('authorization')
    if (authHeader) {
      const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
      if (user) ownerId = user.id
    }
    if (!ownerId) {
      const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'SUPERADMIN').limit(1)
      ownerId = admins?.[0]?.id || null
    }
    if (!ownerId) {
      return NextResponse.json({ error: 'No se encontró propietario' }, { status: 400, headers: cors })
    }

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
