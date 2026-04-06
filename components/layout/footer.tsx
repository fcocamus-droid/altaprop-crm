import { Logo } from './logo'
import { Phone, Mail, MapPin } from 'lucide-react'

export function Footer() {
  return (
    <footer className="bg-navy text-white">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <Logo className="mb-4" onDark />
            <p className="text-white/60 text-sm">
              Plataforma inmobiliaria para la gestion integral de propiedades en arriendo y venta.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-gold mb-4">Enlaces</h4>
            <ul className="space-y-2 text-sm text-white/70">
              <li><a href="/propiedades" className="hover:text-gold transition-colors">Propiedades</a></li>
              <li><a href="/nosotros" className="hover:text-gold transition-colors">Nosotros</a></li>
              <li><a href="/contacto" className="hover:text-gold transition-colors">Contacto</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-gold mb-4">Contacto</h4>
            <ul className="space-y-2 text-sm text-white/70">
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-gold shrink-0" />+56 9 7332 3296
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-gold shrink-0" />contacto@altaprop.cl
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gold shrink-0" />Santiago, Chile
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-white/10 text-center text-sm text-white/40">
          &copy; {new Date().getFullYear()} Altaprop. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  )
}
