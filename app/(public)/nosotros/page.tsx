import { Card, CardContent } from '@/components/ui/card'
import { Shield, Building2, Handshake, Users } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Nosotros' }

export default function NosotrosPage() {
  return (
    <div className="container py-12">
      <div className="max-w-3xl mx-auto text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Sobre <span className="text-navy dark:text-gold">Altaprop</span></h1>
        <p className="text-lg text-muted-foreground">
          Somos una plataforma inmobiliaria chilena dedicada a conectar propietarios con personas que buscan su hogar ideal, de manera transparente y eficiente.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {[
          { icon: Shield, title: 'Transparencia', desc: 'Cada proceso es claro y verificable. Sin costos ocultos ni sorpresas.' },
          { icon: Building2, title: 'Tecnologia', desc: 'Plataforma moderna que facilita la gestion de propiedades y postulaciones.' },
          { icon: Handshake, title: 'Confianza', desc: 'Verificamos documentos y perfiles para garantizar transacciones seguras.' },
          { icon: Users, title: 'Comunidad', desc: 'Conectamos propietarios, agentes y postulantes en un solo lugar.' },
        ].map((item) => (
          <Card key={item.title}>
            <CardContent className="pt-6 flex items-start gap-4">
              <div className="w-12 h-12 bg-gold/10 rounded-lg flex items-center justify-center shrink-0">
                <item.icon className="h-6 w-6 text-gold-dark" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
