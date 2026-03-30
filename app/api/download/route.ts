import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')
  if (!url) return NextResponse.json({ error: 'URL required' }, { status: 400 })

  try {
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Extract bucket and path from URL
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    let bucket = ''
    let filePath = ''

    if (url.includes('/storage/v1/object/public/')) {
      const parts = url.split('/storage/v1/object/public/')[1]
      const slashIndex = parts.indexOf('/')
      bucket = parts.substring(0, slashIndex)
      filePath = parts.substring(slashIndex + 1)
    } else {
      // Fallback: try to proxy the URL directly
      const res = await fetch(url)
      const blob = await res.blob()
      return new NextResponse(blob, {
        headers: {
          'Content-Type': blob.type || 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${request.nextUrl.searchParams.get('name') || 'document'}"`,
        },
      })
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
