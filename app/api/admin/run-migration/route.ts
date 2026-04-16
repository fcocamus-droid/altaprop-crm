/**
 * One-time migration runner — protected by a static secret token.
 * DELETE this file after the migration runs successfully.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

const MIGRATION_SECRET = 'altaprop-migrate-034-claims'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  if (body.secret !== MIGRATION_SECRET) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const admin = createAdminClient()

  // Run each DDL statement via a small helper — Supabase admin client supports
  // raw SQL through the `from` escape hatch when we call a pg function.
  // Since exec_sql doesn't exist, we use the pg-meta internal REST endpoint.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  const sql = `
    CREATE TABLE IF NOT EXISTS red_canjes_claims (
      id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      propietario_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      property_id        UUID REFERENCES properties(id) ON DELETE CASCADE,
      subscriber_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      claimed_by_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      claimed_by_name    TEXT,
      subscriber_name    TEXT,
      notes              TEXT,
      status             TEXT NOT NULL DEFAULT 'active'
                         CHECK (status IN ('active', 'released', 'expired')),
      claimed_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at         TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
      released_at        TIMESTAMPTZ,
      created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_red_canjes_claims_propietario
      ON red_canjes_claims(propietario_id);
    CREATE INDEX IF NOT EXISTS idx_red_canjes_claims_subscriber
      ON red_canjes_claims(subscriber_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_red_canjes_claims_active_unique
      ON red_canjes_claims(propietario_id) WHERE status = 'active';
    ALTER TABLE red_canjes_claims ENABLE ROW LEVEL SECURITY;
    DO $$ BEGIN
      CREATE POLICY "service role full access" ON red_canjes_claims
        FOR ALL USING (true) WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `

  // Use Supabase pg-meta endpoint (available server-side within Vercel env)
  const pgMetaUrl = `${supabaseUrl}/pg-meta/v0/query`
  const res = await fetch(pgMetaUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  })

  const text = await res.text()
  let data: any
  try { data = JSON.parse(text) } catch { data = text }

  if (res.ok) {
    return NextResponse.json({ success: true, result: data })
  }

  // Verify table exists regardless (may have been created already)
  const { data: check, error: checkErr } = await admin
    .from('red_canjes_claims')
    .select('id')
    .limit(1)

  if (!checkErr) {
    return NextResponse.json({ success: true, message: 'Table already exists', pgMetaStatus: res.status })
  }

  return NextResponse.json({
    error: 'Migration failed',
    pgMetaStatus: res.status,
    pgMetaResponse: data,
    checkError: checkErr?.message,
  }, { status: 500 })
}
