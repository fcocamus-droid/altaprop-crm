import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const CF_TOKEN      = process.env.CLOUDFLARE_API_TOKEN
const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID
const VERCEL_TOKEN      = process.env.VERCEL_TOKEN
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID || 'prj_268CbV9qEkFPyBxAmu9KagRKhWH9'
const VERCEL_TEAM_ID    = process.env.VERCEL_TEAM_ID    || 'team_zAPOZcnAAGLeUo9g6KctsXCS'
const VERCEL_IP         = '76.76.21.21'
const VERCEL_CNAME      = 'cname.vercel-dns.com'

/**
 * POST /api/website/setup-domain
 * 1. Creates a Cloudflare zone for the domain (platform-managed account)
 * 2. Adds A record @ → 76.76.21.21 (DNS only)
 * 3. Adds CNAME www → cname.vercel-dns.com (DNS only)
 * 4. Registers domain in Vercel
 * 5. Saves website_domain, website_ns1, website_ns2 to profiles
 * Returns { ns1, ns2 } so the subscriber can configure NIC.cl
 */
export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, id, subscriber_id')
    .eq('id', user.id)
    .single()

  if (!profile || !['SUPERADMIN', 'SUPERADMINBOSS'].includes(profile.role)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { domain } = await request.json()
  const cleanDomain = domain?.toLowerCase().trim().replace(/^www\./, '')
  if (!cleanDomain || !/^([a-z0-9-]+\.)+[a-z]{2,}$/.test(cleanDomain)) {
    return NextResponse.json({ error: 'Dominio inválido' }, { status: 400 })
  }

  // ── If no Cloudflare credentials, return graceful degradation ──
  if (!CF_TOKEN || !CF_ACCOUNT_ID) {
    return NextResponse.json({
      ok: false,
      manual: true,
      message: 'Configuración de Cloudflare pendiente. Contacta a soporte.',
    })
  }

  const cfHeaders = {
    Authorization: `Bearer ${CF_TOKEN}`,
    'Content-Type': 'application/json',
  }

  // ── 1. Check if zone already exists ──
  let zoneId: string | null = null
  let ns1 = '', ns2 = ''

  const existingRes = await fetch(
    `https://api.cloudflare.com/client/v4/zones?name=${cleanDomain}&account.id=${CF_ACCOUNT_ID}`,
    { headers: cfHeaders }
  )
  const existingData = await existingRes.json()

  if (existingData.result?.length > 0) {
    // Zone already exists — reuse it
    zoneId = existingData.result[0].id
    ns1    = existingData.result[0].name_servers?.[0] ?? ''
    ns2    = existingData.result[0].name_servers?.[1] ?? ''
  } else {
    // ── 2. Create new Cloudflare zone ──
    const createRes = await fetch('https://api.cloudflare.com/client/v4/zones', {
      method: 'POST',
      headers: cfHeaders,
      body: JSON.stringify({
        name: cleanDomain,
        account: { id: CF_ACCOUNT_ID },
        jump_start: false,
        type: 'full',
      }),
    })
    const createData = await createRes.json()

    if (!createData.success) {
      console.error('Cloudflare zone creation error:', createData.errors)
      return NextResponse.json({
        ok: false,
        message: `Error al crear zona DNS: ${createData.errors?.[0]?.message ?? 'Error desconocido'}`,
      }, { status: 500 })
    }

    zoneId = createData.result.id
    ns1    = createData.result.name_servers?.[0] ?? ''
    ns2    = createData.result.name_servers?.[1] ?? ''
  }

  // ── 3. Add/ensure A record @ → VERCEL_IP (DNS only) ──
  // ── 4. Add/ensure CNAME www → VERCEL_CNAME (DNS only) ──
  async function upsertRecord(type: string, name: string, content: string) {
    // Check if record already exists
    const listRes = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records?type=${type}&name=${name === '@' ? cleanDomain : `${name}.${cleanDomain}`}`,
      { headers: cfHeaders }
    )
    const listData = await listRes.json()

    if (listData.result?.length > 0) {
      // Update existing record
      const recId = listData.result[0].id
      await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records/${recId}`, {
        method: 'PUT',
        headers: cfHeaders,
        body: JSON.stringify({ type, name, content, proxied: false, ttl: 1 }),
      })
    } else {
      // Create new record
      await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`, {
        method: 'POST',
        headers: cfHeaders,
        body: JSON.stringify({ type, name, content, proxied: false, ttl: 1 }),
      })
    }
  }

  await Promise.all([
    upsertRecord('A',     '@',   VERCEL_IP),
    upsertRecord('CNAME', 'www', VERCEL_CNAME),
  ])

  // ── 5. Register domain in Vercel (root + www) ──
  const registerVercel = async (d: string) => {
    const res = await fetch(
      `https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/domains?teamId=${VERCEL_TEAM_ID}`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${VERCEL_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: d }),
      }
    )
    const data = await res.json()
    return res.ok || data.error?.code === 'domain_already_in_use'
  }
  if (VERCEL_TOKEN) {
    await Promise.all([registerVercel(cleanDomain), registerVercel(`www.${cleanDomain}`)])
  }

  // ── 6. Save to profiles ──
  await supabase
    .from('profiles')
    .update({
      website_domain: cleanDomain,
      website_ns1:    ns1,
      website_ns2:    ns2,
    } as any)
    .eq('id', user.id)

  return NextResponse.json({ ok: true, ns1, ns2, domain: cleanDomain })
}
