import Link from 'next/link'

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#C4A962] rounded-lg flex items-center justify-center text-white font-bold text-sm">A</div>
            <span className="text-xl font-bold text-[#1B2A4A]">Alta<span className="text-[#C4A962]">prop</span></span>
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-sm text-gray-600 hover:text-[#1B2A4A]">Características</Link>
            <Link href="#pricing" className="text-sm text-gray-600 hover:text-[#1B2A4A]">Precios</Link>
            <Link href="#testimonials" className="text-sm text-gray-600 hover:text-[#1B2A4A]">Testimonios</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-[#1B2A4A] hover:underline">Iniciar Sesión</Link>
            <Link href="/signup" className="bg-[#1B2A4A] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#1B2A4A]/90 transition">Prueba Gratis</Link>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="bg-[#1B2A4A] text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-[#C4A962] rounded-lg flex items-center justify-center text-white font-bold text-sm">A</div>
                <span className="text-xl font-bold">Alta<span className="text-[#C4A962]">prop</span></span>
              </div>
              <p className="text-sm text-gray-400">Plataforma de gestión inmobiliaria integral para Chile y Latinoamérica.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Producto</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="#features" className="hover:text-white">Características</Link></li>
                <li><Link href="#pricing" className="hover:text-white">Precios</Link></li>
                <li><Link href="/signup" className="hover:text-white">Prueba Gratis</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Empresa</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="#" className="hover:text-white">Nosotros</Link></li>
                <li><Link href="#" className="hover:text-white">Contacto</Link></li>
                <li><Link href="#" className="hover:text-white">Blog</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Legal</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="#" className="hover:text-white">Términos</Link></li>
                <li><Link href="#" className="hover:text-white">Privacidad</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-700 mt-8 pt-8 text-center text-sm text-gray-500">
            © 2026 Altaprop. Todos los derechos reservados.
          </div>
        </div>
      </footer>
    </div>
  )
}
