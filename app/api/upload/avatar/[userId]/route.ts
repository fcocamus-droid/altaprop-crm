import { NextRequest, NextResponse } from 'next/server'
import { getUserProfile } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'

const MAX_SIZE_BYTES = 2 * 1024 * 1024 // 2 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  // Only admins can upload avatars for other users
  const profile = await getUserProfile()
  if (!profile || !['SUPERADMIN', 'SUPERADMINBOSS'].includes(profile.role)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { userId } = params
  if (!userId) return NextResponse.json({ error: 'userId requerido' }, { status: 400 })

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Formato de solicitud inválido' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No se recibió ningún archivo' }, { status: 400 })

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Tipo no permitido. Usa JPG, PNG o WebP.' }, { status: 400 })
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: 'El archivo supera el límite de 2 MB.' }, { status: 400 })
  }

  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
  const filePath = `avatars/${userId}.${ext}`

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  const admin = createAdminClient()

  const { error: uploadError } = await admin.storage
    .from('property-images')
    .upload(filePath, buffer, { contentType: file.type, upsert: true })

  if (uploadError) {
    return NextResponse.json({ error: `Error al subir: ${uploadError.message}` }, { status: 500 })
  }

  const { data } = admin.storage.from('property-images').getPublicUrl(filePath)
  const url = `${data.publicUrl}?t=${Date.now()}`

  const { error: updateError } = await admin
    .from('profiles')
    .update({ avatar_url: url })
    .eq('id', userId)

  if (updateError) {
    return NextResponse.json({ error: 'Imagen subida pero no se pudo guardar.' }, { status: 500 })
  }

  return NextResponse.json({ url })
}
