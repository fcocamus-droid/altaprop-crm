'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Logo } from './logo'
import type { UserRole } from '@/lib/constants'
import { signOut } from '@/lib/auth-actions'
import { Button } from '@/components/ui/button'
import { menuItems } from '@/lib/navigation'

interface SidebarProps {
  role: UserRole
  userName: string | null
}

export function Sidebar({ role, userName }: SidebarProps) {
  const pathname = usePathname()
  const filteredItems = menuItems.filter(item => item.roles.includes(role))

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-white dark:bg-navy-dark border-r">
      <div className="flex items-center h-16 px-6 border-b">
        <Logo />
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        <nav className="px-3 space-y-1">
          {filteredItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-navy text-white dark:bg-gold dark:text-navy'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </div>

      <div className="border-t p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-gold flex items-center justify-center">
            <span className="text-navy font-semibold text-sm">{userName?.[0]?.toUpperCase() || 'U'}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{userName || 'Usuario'}</p>
            <p className="text-xs text-muted-foreground">{role}</p>
          </div>
        </div>
        <form action={signOut}>
          <Button variant="outline" size="sm" className="w-full" type="submit">
            <LogOut className="mr-2 h-4 w-4" />Cerrar Sesion
          </Button>
        </form>
      </div>
    </aside>
  )
}
