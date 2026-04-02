import { NextRequest, NextResponse } from 'next/server'

/**
 * ML webhook handler — acknowledges notifications from MercadoLibre.
 * ML sends POST notifications when listing status changes.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    // Log webhook notification for debugging (non-blocking)
    console.log('[ML Webhook]', JSON.stringify(body))
    return NextResponse.json({ received: true }, { status: 200 })
  } catch {
    return NextResponse.json({ received: true }, { status: 200 })
  }
}
