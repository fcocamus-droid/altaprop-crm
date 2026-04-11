import { getSubscriberProfile } from '@/lib/queries/website'
import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

async function getNosotrosContent(subscriberId: string): Promise<string | null> {
  try {
    const admin = createAdminClient()
    const { data } = await admin
      .from('profiles')
      .select('website_nosotros_content')
      .eq('id', subscriberId)
      .single()
    return (data as any)?.website_nosotros_content ?? null
  } catch {
    return null
  }
}

export async function generateMetadata({
  params,
}: {
  params: { subdomain: string }
}): Promise<Metadata> {
  const subscriber = await getSubscriberProfile(decodeURIComponent(params.subdomain))
  const name = subscriber?.full_name || 'Portal Inmobiliario'
  return {
    title: `Nosotros | ${name}`,
    description: `Conoce más sobre ${name}`,
  }
}

export default async function NosotrosPage({
  params,
}: {
  params: { subdomain: string }
}) {
  const subscriber = await getSubscriberProfile(decodeURIComponent(params.subdomain))
  if (!subscriber) notFound()

  const primaryColor = subscriber.website_primary_color || '#1a2332'
  const accentColor  = subscriber.website_accent_color  || '#c9a84c'
  const companyName  = subscriber.full_name || 'Nosotros'
  const content      = await getNosotrosContent(subscriber.id)

  return (
    <div className="flex flex-col">

      {/* Hero banner */}
      <section
        className="py-20 text-white text-center"
        style={{ background: primaryColor }}
      >
        <div className="container max-w-2xl">
          <h1 className="text-4xl font-bold mb-4" style={{ color: accentColor }}>
            Nosotros
          </h1>
          <p className="text-white/70 text-lg">
            Conoce más sobre {companyName}
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="container max-w-3xl py-16">
        {content ? (
          <div className="prose prose-lg max-w-none">
            {content.split('\n\n').map((paragraph, i) => (
              <p key={i} className="text-muted-foreground leading-relaxed mb-6 text-[17px]">
                {paragraph}
              </p>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 text-muted-foreground">
            <p className="text-lg">Contenido próximamente.</p>
          </div>
        )}
      </section>

    </div>
  )
}
