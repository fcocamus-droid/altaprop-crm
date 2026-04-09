import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const CF_TOKEN  = process.env.CLOUDFLARE_API_TOKEN
const VERCEL_IP = '76.76.21.21'

/**
 * GET /api/website/verify-domain?domain=mipropiedades.cl
 * Verifies that the subscriber has pointed their domain's nameservers to Cloudflare
 * (the platform-managed zone is now active).
 *
 * Primary check: Cloudflare API → zone status === "active"
 * Fallback check: DoH NS query matches stored ns1/ns2
 * Legacy fallback: A record points to Vercel IP (for non-CF setups)
 */
export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const domain = request.nextUrl.searchParams.get('domain')?.toLowerCase().trim()
  if (!domain) return NextResponse.json({ error: 'Dominio requerido' }, { status: 400 })
  if (!/^([a-z0-9-]+\.)+[a-z]{2,}$/.test(domain)) {
    return NextResponse.json({ verified: false, reason: 'Formato de dominio inválido' })
  }

  try {
    // ── PRIMARY: Check Cloudflare zone status via API ──
    if (CF_TOKEN) {
      const cfRes = await fetch(
        `https://api.cloudflare.com/client/v4/zones?name=${domain}`,
        {
          headers: {
            Authorization: `Bearer ${CF_TOKEN}`,
            'Content-Type': 'application/json',
          },
          next: { revalidate: 0 },
        }
      )
      const cfData = cfRes.ok ? await cfRes.json() : null

      if (cfData?.success && cfData.result?.length > 0) {
        const zone = cfData.result[0]
        if (zone.status === 'active') {
          // Zone is active — domain NS are correctly pointing to Cloudflare
          // Save activation timestamp if needed
          return NextResponse.json({ verified: true, via: 'cloudflare_active' })
        }
        // Zone exists but not active yet
        const ns1 = zone.name_servers?.[0] ?? ''
        const ns2 = zone.name_servers?.[1] ?? ''
        return NextResponse.json({
          verified: false,
          reason: `Zona creada pero aún no activa. Asegúrate de haber ingresado en NIC.cl:`,
          ns1,
          ns2,
          pending: true,
        })
      }
    }

    // ── FALLBACK: Check NS records via DoH ──
    // Load stored nameservers from profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('website_ns1, website_ns2')
      .eq('id', user.id)
      .single()

    const nsRes = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=NS`,
      { headers: { Accept: 'application/dns-json' }, next: { revalidate: 0 } }
    )
    const nsJson = nsRes.ok ? await nsRes.json() : { Answer: [] }
    const nsRecords: string[] = (nsJson.Answer || [])
      .filter((a: any) => a.type === 2)
      .map((a: any) => a.data.replace(/\.$/, '').toLowerCase())

    const storedNs1 = (profile as any)?.website_ns1?.toLowerCase() ?? ''
    const storedNs2 = (profile as any)?.website_ns2?.toLowerCase() ?? ''

    if (storedNs1 && nsRecords.some(ns => ns === storedNs1)) {
      return NextResponse.json({ verified: true, via: 'ns_match' })
    }

    // Generic Cloudflare NS pattern
    const cfNsPattern = /\.ns\.cloudflare\.com$/
    if (nsRecords.some(ns => cfNsPattern.test(ns))) {
      return NextResponse.json({ verified: true, via: 'ns_cloudflare' })
    }

    // ── LEGACY FALLBACK: A record check (for direct DNS providers) ──
    const aRes = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=A`,
      { headers: { Accept: 'application/dns-json' }, next: { revalidate: 0 } }
    )
    const aJson = aRes.ok ? await aRes.json() : { Answer: [] }
    const aRecords: string[] = (aJson.Answer || [])
      .filter((a: any) => a.type === 1)
      .map((a: any) => a.data.trim())

    if (aRecords.some(ip => ip === VERCEL_IP)) {
      return NextResponse.json({ verified: true, via: 'a_record' })
    }

    // Not verified — give useful feedback
    if (nsRecords.length > 0) {
      return NextResponse.json({
        verified: false,
        reason: `Los nameservers apuntan a "${nsRecords[0]}" — aún no son los de Cloudflare. Espera unos minutos y vuelve a intentar.`,
      })
    }

    return NextResponse.json({
      verified: false,
      reason: 'DNS aún no propagado. Verifica que ingresaste los nameservers correctamente en NIC.cl y espera entre 5 minutos y 24 horas.',
    })
  } catch (e) {
    console.error('verify-domain error:', e)
    return NextResponse.json({ verified: false, reason: 'Error al consultar DNS. Intenta de nuevo.' })
  }
}
