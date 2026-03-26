import { RoleGuard } from '@/components/auth/role-guard'
import { getUsers } from '@/lib/actions/users'
import { getUserProfile } from '@/lib/auth'
import { PageHeader } from '@/components/shared/page-header'
import { UserManagement } from '@/components/users/user-management'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Usuarios - Altaprop' }

export default async function UsuariosPage() {
  let users: any[] = []
  let currentUserId = ''

  try {
    users = await getUsers()
    const profile = await getUserProfile()
    currentUserId = profile?.id || ''
  } catch {
    // Supabase may not be configured yet
  }

  return (
    <RoleGuard allowedRoles={['SUPERADMIN']}>
      <PageHeader title="Usuarios" description="Administra los usuarios de la plataforma" />
      <UserManagement users={users} currentUserId={currentUserId} />
    </RoleGuard>
  )
}
