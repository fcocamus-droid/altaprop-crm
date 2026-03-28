export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PricingCards } from '@/components/pricing/pricing-cards'
import { Building2, Users, FileText, Zap, Shield, BarChart3, ArrowRight } from 'lucide-react'

export default async function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-navy via-navy-dark to-navy-800 text-white py-20 md:py-32">
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-5" />
        <div className="container relative">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Tu CRM <span className="text-gold">Inmobiliario</span> en la nube
            </h1>
            <p className="text-lg md:text-xl text-navy-100 mb-8">
              Gestiona propiedades, agentes, postulaciones y clientes desde un solo lugar. La plataforma que tu inmobiliaria necesita para crecer.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="bg-gold text-navy hover:bg-gold-dark font-semibold">
                <Link href="/register">Empieza Gratis <ArrowRight className="ml-2 h-5 w-5" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-gold text-gold hover:bg-gold/10">
                <Link href="#pricing">Ver Planes</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-white dark:bg-background">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Todo lo que necesitas para gestionar tu negocio</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">Altaprop te da las herramientas para administrar tu inmobiliaria de forma profesional y eficiente.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: Building2, title: 'Gestion de Propiedades', desc: 'Publica, edita y administra todas tus propiedades en un solo lugar. Arriendos y ventas.' },
              { icon: Users, title: 'Multi-Agente', desc: 'Invita a tu equipo de agentes. Cada uno gestiona sus propiedades asignadas.' },
              { icon: FileText, title: 'Postulaciones Online', desc: 'Recibe postulaciones de interesados con documentos adjuntos. Aprueba o rechaza facilmente.' },
              { icon: Zap, title: 'Importacion Automatica', desc: 'Importa propiedades desde Portal Inmobiliario con un solo clic.' },
              { icon: Shield, title: 'Roles y Permisos', desc: 'Control total de accesos. Agentes, propietarios y postulantes cada uno con su nivel.' },
              { icon: BarChart3, title: 'Dashboard Completo', desc: 'Estadisticas en tiempo real de tus propiedades, postulaciones y rendimiento.' },
            ].map((feature) => (
              <Card key={feature.title} className="hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 bg-gold/10 rounded-xl flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-gold-dark" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 bg-muted/30">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Planes para cada etapa de tu negocio</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">Elige el plan que mejor se adapte a tu inmobiliaria. Cambia de plan cuando quieras.</p>
          </div>
          <PricingCards onSelect={(planId) => {}} mode="landing" />
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-navy text-white">
        <div className="container text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Lleva tu inmobiliaria al siguiente nivel</h2>
          <p className="text-navy-100 mb-8 max-w-xl mx-auto">
            Unete a las inmobiliarias que ya usan Altaprop para gestionar su negocio de forma profesional.
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
