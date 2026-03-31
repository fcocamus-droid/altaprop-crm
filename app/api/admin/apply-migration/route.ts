import { NextResponse } from 'next/server'
import { getUserProfile } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const MIGRATION_SQL = `
ALTER TABLE public.applications DROP CONSTRAINT IF EXISTS applications_status_check;
ALTER TABLE public.applications
  ADD CONSTRAINT applications_status_check
  CHECK (status IN ('pending', 'reviewing', 'approved', 'rejected', 'rented', 'sold'));
`

export async function POST() {
  const profile = await getUserProfile()
  if (!profile || !['SUPERADMINBOSS', 'SUPERADMIN'].includes(profile.role)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  // Extract project ref from URL: https://{ref}.supabase.co
  const projectRef = supabaseUrl.replace('https://', '').replace('.supabase.co', '')

  try {
    // Try Supabase Management API with service role key
    const res = await fetch(
      `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: MIGRATION_SQL }),
      }
    )

    const data = await res.json()

    if (!res.ok) {
      // If management API fails, return the SQL for manual execution
      return NextResponse.json({
        error: 'La API de administración requiere un token personal. Ejecuta el SQL manualmente.',
        sql: MIGRATION_SQL.trim(),
        hint: 'Ve a supabase.com → tu proyecto → SQL Editor → pega el SQL y ejecuta',
        apiError: data,
      }, { status: 422 })
    }

    return NextResponse.json({ success: true, message: 'Migración aplicada correctamente' })
  } catch (e: any) {
    return NextResponse.json({
      error: e.message,
      sql: MIGRATION_SQL.trim(),
      hint: 'Ejecuta el SQL en: supabase.com → tu proyecto → SQL Editor',
    }, { status: 500 })
  }
}
