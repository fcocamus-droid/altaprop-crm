import { NextRequest, NextResponse } from 'next/server'
import { getUserProfile } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'

const MAX_SIZE_BYTES = 2 * 1024 * 1024 // 2 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export async function POST(request: NextRequest) {
  // Auth check
  const profile = await getUserProfile()
  if (!profile) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Formato de solicitud inválido' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  if (!file) {
    return NextResponse.json({ error: 'No se recibió ningún archivo' }, { status: 400 })
  }

  // Validate type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Tipo de archivo no permitido. Usa JPG, PNG o WebP.' }, { status: 400 })
  }

  // Validate size
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: 'El archivo supera el límite de 2 MB.' }, { status: 400 })
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const filePath = `avatars/${profile.id}.${ext}`

  // Convert file to buffer
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  // Use admin client to bypass storage RLS
  const admin = createAdminClient()
  const { error: uploadError } = await admin.storage
    .from('property-images')
    .upload(filePath, buffer, {
      contentType: file.type,
      upsert: true,
    })

  if (uploadError) {
    console.error('[avatar-upload] storage error:', uploadError)
    return NextResponse.json({ error: `Error al subir la imagen: ${uploadError.message}` }, { status: 500 })
  }

  // Get public URL
  const { data } = admin.storage.from('property-images').getPublicUrl(filePath)
  const url = `${data.publicUrl}?t=${Date.now()}`

  // Save to profile
  const { error: updateError } = await admin
    .from('profiles')
    .update({ avatar_url: url })
    .eq('id', profile.id)

  if (updateError) {
    console.error('[avatar-upload] profile update error:', updateError)
    return NextResponse.json({ error: 'Imagen subida, pero no se pudo guardar en el perfil.' }, { status: 500 })
  }

  return NextResponse.json({ url })
}
