import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PropertyCard } from '@/components/properties/property-card'
import { getFeaturedProperties } from '@/lib/queries/properties'
import { Search, Building2, Shield, Handshake, Home, Building, TreePine } from 'lucide-react'

export default async function HomePage() {
  let featuredProperties: any[] = []
  try {
    featuredProperties = await getFeaturedProperties()
  } catch {
    // Supabase may not be configured yet
  }

  return (
    <>
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-navy via-navy-dark to-navy-800 text-white py-20 md:py-32">
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-5" />
        <div className="container relative">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Encuentra tu <span className="text-gold">propiedad ideal</span>
            </h1>
            <p className="text-lg md:text-xl text-navy-100 mb-8">
              Plataforma inmobiliaria para la gestion integral de propiedades en arriendo y venta en Chile.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="bg-gold text-navy hover:bg-gold-dark font-semibold">
                <Link href="/propiedades"><Search className="mr-2 h-5 w-5" />Buscar Propiedades</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-gold text-gold hover:bg-gold/10">
                <Link href="/register">Publica tu Propiedad</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Property Categories */}
      <section className="py-16 bg-white dark:bg-background">
        <div className="container">
          <h2 className="text-3xl font-bold text-center mb-10">Tipos de Propiedad</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: Building2, label: 'Departamentos', desc: 'Encuentra departamentos en las mejores ubicaciones' },
              { icon: Home, label: 'Casas', desc: 'Casas amplias para toda la familia' },
              { icon: TreePine, label: 'Villas y Terrenos', desc: 'Parcelas y villas en entornos naturales' },
            ].map((cat) => (
              <Link href={`/propiedades?type=${cat.label.toLowerCase()}`} key={cat.label}>
                <Card className="hover:shadow-lg transition-shadow text-center p-6 group">
                  <CardContent className="pt-4">
                    <div className="w-16 h-16 bg-gold/10 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-gold/20 transition-colors">
                      <cat.icon className="h-8 w-8 text-gold-dark" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">{cat.label}</h3>
                    <p className="text-sm text-muted-foreground">{cat.desc}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Properties */}
      {featuredProperties.length > 0 && (
        <section className="py-16 bg-muted/30">
          <div className="container">
            <div className="flex items-center justify-between mb-10">
              <h2 className="text-3xl font-bold">Propiedades Destacadas</h2>
              <Button asChild variant="outline">
                <Link href="/propiedades">Ver Todas</Link>
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredProperties.map(property => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Value Props */}
      <section className="py-16 bg-white dark:bg-background">
        <div className="container">
          <h2 className="text-3xl font-bold text-center mb-10">Por que Altaprop?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: Shield, title: 'Transparencia', desc: 'Proceso transparente y seguro en cada transaccion inmobiliaria.' },
              { icon: Building, title: 'Amplio Catalogo', desc: 'Gran variedad de propiedades en todo Chile para arriendo y venta.' },
              { icon: Handshake, title: 'Acompanamiento', desc: 'Te acompanamos en todo el proceso de arriendo o compra de tu propiedad.' },
            ].map((vp) => (
              <div key={vp.title} className="text-center">
                <div className="w-14 h-14 bg-navy/5 dark:bg-navy/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <vp.icon className="h-7 w-7 text-navy dark:text-gold" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{vp.title}</h3>
                <p className="text-sm text-muted-foreground">{vp.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-navy text-white">
        <div className="container text-center">
          <h2 className="text-3xl font-bold mb-4">Listo para empezar?</h2>
          <p className="text-navy-100 mb-8 max-w-xl mx-auto">
            Registrate hoy y accede a nuestra plataforma inmobiliaria. Publica tu propiedad o encuentra tu hogar ideal.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="bg-gold text-navy hover:bg-gold-dark font-semibold">
              <Link href="/register">Crear Cuenta Gratis</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
              <Link href="/contacto">Contactanos</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  )
}
