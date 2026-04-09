'use client'

import { BarChart3, Eye, MousePointer, MessageCircle, TrendingUp, Lock } from 'lucide-react'

const UPCOMING = [
  { icon: Eye,          title: 'Vistas al sitio',     desc: 'Cuántas personas visitaron tu sitio esta semana' },
  { icon: MousePointer, title: 'Clics en propiedades', desc: 'Qué propiedades generan más interés' },
  { icon: MessageCircle, title: 'Leads por WhatsApp',  desc: 'Contactos generados desde el botón de WhatsApp' },
  { icon: TrendingUp,   title: 'Tendencias',           desc: 'Evolución mensual de visitas y consultas' },
]

export function WebsiteEstadisticasTab() {
  return (
    <div className="max-w-2xl">
      {/* Placeholder banner */}
      <div className="flex flex-col items-center text-center py-10 px-6 bg-muted/30 rounded-2xl border border-dashed mb-8">
        <div className="w-16 h-16 bg-navy/10 rounded-2xl flex items-center justify-center mb-4">
          <BarChart3 className="h-8 w-8 text-navy/60" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Estadísticas próximamente</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          Pronto podrás ver métricas en tiempo real de tu sitio web: visitas, propiedades más vistas,
          leads generados y más.
        </p>
      </div>

      {/* Feature preview cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {UPCOMING.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="flex gap-3 p-4 border rounded-xl bg-white relative overflow-hidden">
            <div className="absolute top-2 right-2">
              <Lock className="h-3 w-3 text-muted-foreground/40" />
            </div>
            <div className="w-9 h-9 bg-gold/10 rounded-lg flex items-center justify-center shrink-0">
              <Icon className="h-4 w-4 text-gold-dark" />
            </div>
            <div>
              <p className="font-medium text-sm">{title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
