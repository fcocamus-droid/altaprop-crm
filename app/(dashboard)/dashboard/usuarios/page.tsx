import { RoleGuard } from '@/components/auth/role-guard'
import { getUsers } from '@/lib/actions/users'
import { PageHeader } from '@/components/shared/page-header'
import { UserManagement } from '@/components/users/user-management'
import { ADMIN_ROLES } from '@/lib/constants'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Usuarios - Altaprop' }

export default async function UsuariosPage() {
  let users: any[] = []
  let currentUserId = ''
  let currentUserRole = 'SUPERADMIN'

  try {
    const result = await getUsers()
    users = result.users
    currentUserId = result.profile?.id || ''
    currentUserRole = result.profile?.role || 'SUPERADMIN'
  } catch {
    // Supabase may not be configured yet
  }

  return (
    <RoleGuard allowedRoles={ADMIN_ROLES}>
      <PageHeader title="Usuarios" description="Administra los usuarios de la plataforma" />
      <UserManagement users={users} currentUserId={currentUserId} currentUserRole={currentUserRole} />
    </RoleGuard>
  )
}
