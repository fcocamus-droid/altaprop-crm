import { NextRequest, NextResponse } from 'next/server'
import { getUserProfile } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

// POST: upload a file for an other service payment and return the public URL
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const profile = await getUserProfile()
  if (!profile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (profile.role === 'POSTULANTE') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No se recibió archivo' }, { status: 400 })

  const maxSize = 20 * 1024 * 1024 // 20 MB
  if (file.size > maxSize) {
    return NextResponse.json({ error: 'El archivo supera los 20 MB' }, { status: 400 })
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'bin'
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const filePath = `other-services/${params.id}/${Date.now()}-${safeName}`

  const admin = createAdminClient()
  const { error: uploadError } = await admin.storage
    .from('property-images')
    .upload(filePath, file, { contentType: file.type, upsert: false })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { data: urlData } = admin.storage
    .from('property-images')
    .getPublicUrl(filePath)

  return NextResponse.json({ url: urlData.publicUrl, name: file.name })
}
