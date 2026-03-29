'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X, LogIn, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { Logo } from './logo'
import { Button } from '@/components/ui/button'
import { useUser } from '@/hooks/use-user'

const navLinks = [
  { href: '/propiedades', label: 'Propiedades' },
  { href: '/nosotros', label: 'Nosotros' },
  { href: '/contacto', label: 'Contacto' },
]

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()
  const { user, loading } = useUser()

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:bg-navy-dark/95">
      <div className="container flex h-16 items-center justify-between">
        <Logo />

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-medium transition-colors hover:text-navy dark:hover:text-gold ${
                pathname === link.href ? 'text-navy dark:text-gold' : 'text-muted-foreground'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <Button asChild className="bg-navy hover:bg-navy/90">
              <Link href="/dashboard"><LogIn className="mr-2 h-4 w-4" />Mi Panel</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="outline" size="sm">
                <Link href="/login"><LogIn className="mr-2 h-4 w-4" />Iniciar Sesion</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/register"><UserPlus className="mr-2 h-4 w-4" />Registrarse</Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t bg-white dark:bg-navy-dark p-4 space-y-3">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="block py-2 text-sm font-medium" onClick={() => setMobileOpen(false)}>
              {link.label}
            </Link>
          ))}
          <div className="flex gap-2 pt-2">
            {user ? (
              <Button asChild className="w-full"><Link href="/dashboard">Mi Panel</Link></Button>
            ) : (
              <>
                <Button asChild variant="outline" className="flex-1"><Link href="/login">Iniciar Sesion</Link></Button>
                <Button asChild className="flex-1"><Link href="/register">Registrarse</Link></Button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
