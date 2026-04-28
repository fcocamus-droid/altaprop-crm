import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { getUserProfile } from '@/lib/auth'

// Only Supabase Storage paths are downloadable through this route, and only
// from buckets the platform actually owns. The previous fallback that fetched
// arbitrary URLs was a textbook SSRF vector.
const ALLOWED_BUCKETS = new Set([
  'property-images',
  'inbox-media',
  'application-documents',
  'commission-receipts',
  'payment-receipts',
])

export async function GET(request: NextRequest) {
  // Require an authenticated user — the file might be private.
  const profile = await getUserProfile()
  if (!profile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const url = request.nextUrl.searchParams.get('url')
  if (!url) return NextResponse.json({ error: 'URL required' }, { status: 400 })

  // The URL must be a Supabase Storage URL on this very project — anything
  // else is rejected (no proxying for arbitrary URLs).
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  if (!url.startsWith(supabaseUrl)) {
    return NextResponse.json({ error: 'URL no soportada' }, { status: 400 })
  }
  const marker = url.includes('/storage/v1/object/public/')
    ? '/storage/v1/object/public/'
    : url.includes('/storage/v1/object/sign/')
      ? '/storage/v1/object/sign/'
      : null
  if (!marker) {
    return NextResponse.json({ error: 'URL no soportada' }, { status: 400 })
  }

  try {
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const parts = url.split(marker)[1]
    const slashIndex = parts.indexOf('/')
    const bucket = parts.substring(0, slashIndex)
    let filePath = parts.substring(slashIndex + 1)
    // Strip query string and any trailing signed-token segment
    filePath = filePath.split('?')[0]

    if (!ALLOWED_BUCKETS.has(bucket)) {
      return NextResponse.json({ error: 'Bucket no soportado' }, { status: 400 })
    }

    // Download via admin client
    const { data, error } = await admin.storage.from(bucket).download(filePath)

    if (error || !data) {
      return NextResponse.json({ error: error?.message || 'File not found' }, { status: 404 })
    }

    const fileName = request.nextUrl.searchParams.get('name') || filePath.split('/').pop() || 'document'
    const ext = fileName.split('.').pop()?.toLowerCase()

    const mimeTypes: Record<string, string> = {
      pdf: 'application/pdf',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    }

    return new NextResponse(data, {
      headers: {
        'Content-Type': mimeTypes[ext || ''] || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
