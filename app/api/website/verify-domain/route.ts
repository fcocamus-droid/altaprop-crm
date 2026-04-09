import { NextRequest, NextResponse } from 'next/server'
import { getUserProfile } from '@/lib/auth'

// Vercel's CNAME target for custom domains
const VERCEL_CNAME = 'cname.vercel-dns.com'
// Vercel's A record IP for root domains
const VERCEL_IP    = '76.76.21.21'

export async function GET(request: NextRequest) {
  const profile = await getUserProfile()
  if (!profile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const domain = request.nextUrl.searchParams.get('domain')?.toLowerCase().trim()
  if (!domain) return NextResponse.json({ error: 'Dominio requerido' }, { status: 400 })

  if (!/^([a-z0-9-]+\.)+[a-z]{2,}$/.test(domain)) {
    return NextResponse.json({ verified: false, reason: 'Formato de dominio inválido' })
  }

  try {
    // Check CNAME record (works for www.domain.com or domain.com subdomains)
    const [cnameRes, aRes] = await Promise.all([
      fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=CNAME`,
        { headers: { Accept: 'application/dns-json' }, next: { revalidate: 0 } }),
      fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=A`,
        { headers: { Accept: 'application/dns-json' }, next: { revalidate: 0 } }),
    ])

    const cnameJson = cnameRes.ok ? await cnameRes.json() : { Answer: [] }
    const aJson     = aRes.ok    ? await aRes.json()     : { Answer: [] }

    const cnameAnswers: { type: number; data: string }[] = cnameJson.Answer || []
    const aAnswers:     { type: number; data: string }[] = aJson.Answer     || []

    const cnames  = cnameAnswers.filter(a => a.type === 5).map(a => a.data.replace(/\.$/, '').toLowerCase())
    const arecords = aAnswers.filter(a => a.type === 1).map(a => a.data.trim())

    // Valid if CNAME points to cname.vercel-dns.com OR A record points to Vercel IP
    const validCname = cnames.some(c => c === VERCEL_CNAME)
    const validA     = arecords.some(ip => ip === VERCEL_IP)

    if (validCname || validA) {
      return NextResponse.json({ verified: true, via: validCname ? 'cname' : 'a' })
    }

    // Give specific feedback
    if (cnames.length > 0) {
      return NextResponse.json({
        verified: false,
        reason: `El CNAME apunta a "${cnames[0]}" pero debe apuntar a "${VERCEL_CNAME}"`,
      })
    }
    if (arecords.length > 0) {
      return NextResponse.json({
        verified: false,
        reason: `El registro A apunta a "${arecords[0]}" pero debe apuntar a "${VERCEL_IP}"`,
      })
    }

    return NextResponse.json({
      verified: false,
      reason: `No se encontró DNS configurado para ${domain}. Agrega un registro CNAME o A según las instrucciones.`,
    })
  } catch {
    return NextResponse.json({ verified: false, reason: 'Error al consultar DNS. Intenta de nuevo.' })
  }
}
