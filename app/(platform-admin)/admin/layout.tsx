import { getUserProfile } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  LifeBuoy,
  LogOut,
} from 'lucide-react'

const menuItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/organizations', label: 'Organizaciones', icon: Building2 },
  { href: '/admin/subscriptions', label: 'Suscripciones', icon: CreditCard },
  { href: '/admin/support', label: 'Soporte', icon: LifeBuoy },
]

export default async function PlatformAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const profile = await getUserProfile()

  if (!profile) {
    redirect('/login')
  }

  if (profile.role !== 'SUPERADMIN') {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-slate-100 flex">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-[#0f1a2e] text-white flex flex-col">
        {/* Logo */}
        <div className="px-6 py-5 border-b border-white/10">
          <h1 className="text-xl font-bold tracking-tight">
            <span className="text-[#c9a94e]">Altaprop</span>{' '}
            <span className="text-white/80 font-normal text-sm">Admin</span>
          </h1>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          ))}
        </nav>

        {/* User info */}
        <div className="px-4 py-4 border-t border-white/10">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-[#c9a94e] flex items-center justify-center text-sm font-bold text-[#0f1a2e]">
              {profile.full_name?.charAt(0)?.toUpperCase() || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {profile.full_name || 'Admin'}
              </p>
              <p className="text-xs text-white/50">SUPERADMIN</p>
            </div>
            <Link
              href="/login"
              className="text-white/40 hover:text-white/70 transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 pl-64">
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-sm border-b border-slate-200 px-8 py-4">
          <p className="text-xs font-semibold text-[#c9a94e] uppercase tracking-widest">
            Platform Administration
          </p>
        </header>
        <main className="p-8">{children}</main>
      </div>
    </div>
  )
}
