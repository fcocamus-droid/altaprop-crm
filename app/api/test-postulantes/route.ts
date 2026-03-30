import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data, error } = await admin
      .from('profiles')
      .select('id, full_name, phone, rut, role, created_at')
      .eq('role', 'POSTULANTE')
      .order('created_at', { ascending: false })

    return NextResponse.json({
      success: true,
      count: data?.length || 0,
      postulantes: data,
      error: error?.message,
      env_url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING',
      env_key: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING',
    })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message })
  }
}
