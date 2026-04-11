import { getSubscriberProfile } from '@/lib/queries/website'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Phone, Mail, MessageCircle, Building2 } from 'lucide-react'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: { subdomain: string }
}): Promise<Metadata> {
  const subscriber = await getSubscriberProfile(decodeURIComponent(params.subdomain))
  const name    = subscriber?.full_name || 'Portal Inmobiliario'
  const favicon = subscriber?.avatar_url || '/icon.svg'

  return {
    title: {
      default: name,
      template: `%s | ${name}`,
    },
    icons: {
      icon: favicon,
      apple: favicon,
    },
  }
}

export default async function SiteLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { subdomain: string }
}) {
  const subscriber = await getSubscriberProfile(decodeURIComponent(params.subdomain))

  if (!subscriber) notFound()

  // Disabled sites render only children (page.tsx shows "coming soon" full-screen)
  if (!subscriber.website_enabled) {
    return <>{children}</>
  }

  const primaryColor = subscriber.website_primary_color || '#1a2332'
  const accentColor  = subscriber.website_accent_color  || '#c9a84c'
  const companyName  = subscriber.full_name || 'Portal Inmobiliario'

  return (
    <div className="flex min-h-screen flex-col" style={{ '--primary': primaryColor, '--accent': accentColor } as React.CSSProperties}>

      {/* Header */}
      <header className="sticky top-0 z-50 shadow-sm" style={{ background: primaryColor }}>
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            {subscriber.avatar_url ? (
              <img src={subscriber.avatar_url} alt={companyName} className="h-9 w-auto max-w-[140px] object-contain rounded" />
            ) : (
              <div className="flex items-center gap-2">
                <Building2 className="h-7 w-7" style={{ color: accentColor }} />
                <span className="text-white font-bold text-lg tracking-tight">{companyName}</span>
              </div>
            )}
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <Link href="/" className="text-sm font-medium text-white/80 hover:text-white transition-colors">Inicio</Link>
            <Link href="/propiedades" className="text-sm font-medium text-white/80 hover:text-white transition-colors">Propiedades</Link>
            <Link href="/nosotros" className="text-sm font-medium text-white/80 hover:text-white transition-colors">Nosotros</Link>
          </nav>

          {subscriber.website_whatsapp && (
            <a
              href={`https://wa.me/${subscriber.website_whatsapp.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ background: accentColor, color: primaryColor }}
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </a>
          )}
        </div>
      </header>

      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer style={{ background: primaryColor }} className="text-white">
        <div className="container py-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              {subscriber.avatar_url ? (
                <img src={subscriber.avatar_url} alt={companyName} className="h-10 w-auto max-w-[160px] object-contain mb-4 rounded" />
              ) : (
                <p className="text-lg font-bold mb-4" style={{ color: accentColor }}>{companyName}</p>
              )}
              {subscriber.website_about_text && (
                <p className="text-white/60 text-sm">{subscriber.website_about_text}</p>
              )}
            </div>
            <div>
              <h4 className="font-semibold mb-4" style={{ color: accentColor }}>Navegación</h4>
              <ul className="space-y-2 text-sm text-white/70">
                <li><Link href="/" className="hover:text-white transition-colors">Inicio</Link></li>
                <li><Link href="/propiedades" className="hover:text-white transition-colors">Propiedades</Link></li>
                <li><Link href="/nosotros" className="hover:text-white transition-colors">Nosotros</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4" style={{ color: accentColor }}>Contacto</h4>
              <ul className="space-y-2 text-sm text-white/70">
                {subscriber.phone && (
                  <li className="flex items-center gap-2">
                    <Phone className="h-4 w-4 shrink-0" style={{ color: accentColor }} />
                    {subscriber.phone}
                  </li>
                )}
                {subscriber.website_whatsapp && (
                  <li className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4 shrink-0" style={{ color: accentColor }} />
                    <a href={`https://wa.me/${subscriber.website_whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                      WhatsApp
                    </a>
                  </li>
                )}
                {subscriber.email && (
                  <li className="flex items-center gap-2">
                    <Mail className="h-4 w-4 shrink-0" style={{ color: accentColor }} />
                    <a href={`mailto:${subscriber.email}`} className="hover:text-white transition-colors">{subscriber.email}</a>
                  </li>
                )}
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between text-xs text-white/30">
            <span>&copy; {new Date().getFullYear()} {companyName}. Todos los derechos reservados.</span>
            <a href="https://altaprop-app.cl" target="_blank" rel="noopener noreferrer" className="hover:text-white/60 transition-colors">
              Powered by Altaprop
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
