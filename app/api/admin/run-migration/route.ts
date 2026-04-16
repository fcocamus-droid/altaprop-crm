/**
 * One-time migration runner — only callable by SUPERADMINBOSS.
 * Creates the red_canjes_claims table via Supabase Management API.
 * DELETE this file after running once in production.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getUserProfile } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(_request: NextRequest) {
  const profile = await getUserProfile()
  if (!profile || profile.role !== 'SUPERADMINBOSS') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  // Extract project ref from URL: https://<ref>.supabase.co
  const ref = supabaseUrl.replace('https://', '').split('.')[0]

  // Supabase Management API — requires a personal access token, not service role
  // We use the pg-meta internal endpoint that Supabase studio uses
  const managementUrl = `https://api.supabase.com/v1/projects/${ref}/database/query`

  // Since management API needs PAT, we'll use a different approach:
  // POST directly to the Supabase pg-meta endpoint accessible internally
  const pgMetaUrl = `${supabaseUrl}/pg-meta/v0/query`

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
      ON red_canjes_claims(propietario_id)
      WHERE status = 'active';

    ALTER TABLE red_canjes_claims ENABLE ROW LEVEL SECURITY;

    DO $$ BEGIN
      CREATE POLICY "service role full access" ON red_canjes_claims
        FOR ALL USING (true) WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `

  // Try pg-meta internal endpoint
  const res = await fetch(pgMetaUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      'X-Connection-Encrypted': serviceKey,
    },
    body: JSON.stringify({ query: sql }),
  })

  const text = await res.text()
  let data: any
  try { data = JSON.parse(text) } catch { data = text }

  if (res.ok) {
    return NextResponse.json({ success: true, result: data })
  }

  // Return the SQL so it can be run manually if the endpoint fails
  return NextResponse.json({
    error: 'Auto-migration failed. Run this SQL manually in Supabase dashboard → SQL Editor.',
    status: res.status,
    response: data,
    sql,
  }, { status: 200 }) // 200 so it's easy to read
}
