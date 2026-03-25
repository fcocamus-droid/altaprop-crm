import { getUserProfile } from '@/lib/auth'
import { redirect } from 'next/navigation'
import type { UserRole } from '@/lib/constants'

interface RoleGuardProps {
  allowedRoles: UserRole[]
  children: React.ReactNode
}

export async function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const profile = await getUserProfile()

  if (!profile) {
    redirect('/login')
  }

  if (!allowedRoles.includes(profile.role)) {
    redirect('/dashboard')
  }

  return <>{children}</>
}
