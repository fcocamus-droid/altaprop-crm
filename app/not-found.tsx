import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-navy via-navy-dark to-navy-800">
      <div className="text-center text-white">
        <div className="w-20 h-20 bg-gold rounded-2xl flex items-center justify-center mx-auto mb-6">
          <span className="text-navy font-bold text-4xl">A</span>
        </div>
        <h1 className="text-6xl font-bold mb-4">404</h1>
        <p className="text-xl text-navy-100 mb-8">Pagina no encontrada</p>
        <Button asChild size="lg" className="bg-gold text-navy hover:bg-gold-dark">
          <Link href="/">Volver al Inicio</Link>
        </Button>
      </div>
    </div>
  )
}
