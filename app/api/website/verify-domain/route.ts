import { NextRequest, NextResponse } from 'next/server'
import { getUserProfile } from '@/lib/auth'

const EXPECTED_CNAME = process.env.NEXT_PUBLIC_SITE_URL?.replace('https://', '') || 'altaprop-app.cl'

export async function GET(request: NextRequest) {
  const profile = await getUserProfile()
  if (!profile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const domain = request.nextUrl.searchParams.get('domain')?.toLowerCase().trim()
  if (!domain) return NextResponse.json({ error: 'Dominio requerido' }, { status: 400 })

  // Basic domain format validation
  if (!/^([a-z0-9-]+\.)+[a-z]{2,}$/.test(domain)) {
    return NextResponse.json({ verified: false, reason: 'Formato de dominio inválido' })
  }

  try {
    // Use Cloudflare's DNS-over-HTTPS to resolve CNAME
    const res = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=CNAME`,
      { headers: { Accept: 'application/dns-json' }, next: { revalidate: 0 } }
    )

    if (!res.ok) {
      return NextResponse.json({ verified: false, reason: 'Error al verificar DNS. Intenta de nuevo.' })
    }

    const json = await res.json()
    const answers: { type: number; data: string }[] = json.Answer || []

    // CNAME records are type 5
    const cnames = answers.filter(a => a.type === 5).map(a => a.data.replace(/\.$/, '').toLowerCase())

    if (cnames.length === 0) {
      return NextResponse.json({
        verified: false,
        reason: `No se encontró un registro CNAME para ${domain}. Configura un CNAME apuntando a ${EXPECTED_CNAME}`,
      })
    }

    const pointsCorrectly = cnames.some(c => c === EXPECTED_CNAME || c.endsWith(`.${EXPECTED_CNAME}`))

    if (pointsCorrectly) {
      return NextResponse.json({ verified: true })
    }

    return NextResponse.json({
      verified: false,
      reason: `El CNAME apunta a "${cnames[0]}" pero debería apuntar a "${EXPECTED_CNAME}"`,
    })
  } catch {
    return NextResponse.json({ verified: false, reason: 'Error al consultar DNS. Intenta de nuevo.' })
  }
}
