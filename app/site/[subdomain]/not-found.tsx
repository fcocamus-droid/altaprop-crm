import Link from 'next/link'
import { Building2 } from 'lucide-react'

export default function SiteNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <Building2 className="h-16 w-16 text-muted-foreground/30 mb-4" />
      <h1 className="text-3xl font-bold mb-2">Sitio no disponible</h1>
      <p className="text-muted-foreground mb-6">
        Este sitio web no existe o no está activo en este momento.
      </p>
      <Link href="https://altaprop-app.cl" className="text-sm text-muted-foreground hover:underline">
        Volver a Altaprop
      </Link>
    </div>
  )
}
