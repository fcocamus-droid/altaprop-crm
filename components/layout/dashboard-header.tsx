'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Logo } from './logo'
import { LogOut, Menu } from 'lucide-react'
import { cn } from '@/lib/utils'
import { signOut } from '@/lib/auth-actions'
import { Button } from '@/components/ui/button'
import type { UserRole } from '@/lib/constants'
import { menuItems } from '@/lib/navigation'

export function DashboardHeader({ role }: { role: UserRole }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const filteredItems = menuItems.filter(item => item.roles.includes(role))

  return (
    <>
      <header className="lg:hidden sticky top-0 z-40 flex h-14 items-center gap-4 border-b bg-white dark:bg-navy-dark px-4">
        <button onClick={() => setOpen(!open)}>
          <Menu className="h-6 w-6" />
        </button>
        <Logo />
      </header>
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/50" onClick={() => setOpen(false)}>
          <div className="w-64 h-full bg-white dark:bg-navy-dark p-4" onClick={(e) => e.stopPropagation()}>
            <Logo className="mb-6" />
            <nav className="space-y-1">
              {filteredItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    pathname === item.href ? 'bg-navy text-white' : 'text-muted-foreground hover:bg-muted'
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="mt-6">
              <form action={signOut}>
                <Button variant="outline" size="sm" className="w-full" type="submit">
                  <LogOut className="mr-2 h-4 w-4" />Cerrar Sesion
                </Button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
