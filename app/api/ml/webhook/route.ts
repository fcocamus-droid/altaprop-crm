import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

/**
 * ML webhook handler — receives real-time notifications from MercadoLibre.
 * - topic "items"     → listing status changed (active, paused, closed, etc.)
 * - topic "vis_leads" → new real-estate inquiry from Portal Inmobiliario
 *
 * Always returns 200 so ML doesn't retry.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const { topic, resource, user_id: mlUserId } = body

    console.log('[ML Webhook]', JSON.stringify({ topic, resource, mlUserId }))

    // ── Item status changes ──────────────────────────────────────────────────
    if (topic === 'items' && resource) {
      // resource is "/items/MLC123456789" or just "MLC123456789"
      const mlItemId = String(resource).replace(/^\/items\//, '').trim()

      if (mlItemId) {
        // Find the property that has this ML item ID
        const { data: property } = await supabaseAdmin
          .from('properties')
          .select('id, subscriber_id')
          .eq('ml_item_id', mlItemId)
          .maybeSingle()

        if (property?.subscriber_id) {
          // Get subscriber's access token to fetch current ML status
          const { data: sub } = await supabaseAdmin
            .from('profiles')
            .select('ml_access_token')
            .eq('id', property.subscriber_id)
            .maybeSingle()

          if (sub?.ml_access_token) {
            const mlRes = await fetch(
              `https://api.mercadolibre.com/items/${mlItemId}?attributes=id,status`,
              { headers: { Authorization: `Bearer ${sub.ml_access_token}` } }
            )

            if (mlRes.ok) {
              const mlItem = await mlRes.json()
              // Normalize ML statuses to our schema values
              const statusMap: Record<string, string> = {
                active:       'active',
                paused:       'paused',
                closed:       'closed',
                under_review: 'paused',
                inactive:     'paused',
                payment_required: 'paused',
              }
              const newStatus = statusMap[mlItem.status as string] ?? mlItem.status ?? 'unknown'

              await supabaseAdmin
                .from('properties')
                .update({ ml_status: newStatus })
                .eq('id', property.id)

              console.log(`[ML Webhook] Property ${property.id} ml_status → ${newStatus}`)
            }
          }
        }
      }
    }

    // ── New real-estate inquiry (Portal Inmobiliario / ML) ───────────────────
    if (topic === 'vis_leads' && resource) {
      // Future: fetch lead details and create a notification or contact in CRM
      console.log(`[ML Webhook] vis_lead from ML user ${mlUserId}: ${resource}`)
    }

    return NextResponse.json({ received: true }, { status: 200 })
  } catch (err) {
    console.error('[ML Webhook] Error:', err)
    // Always 200 — prevents ML from retrying with backoff
    return NextResponse.json({ received: true }, { status: 200 })
  }
}
