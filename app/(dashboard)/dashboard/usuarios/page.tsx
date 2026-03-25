import { RoleGuard } from '@/components/auth/role-guard'
import { getUsers } from '@/lib/actions/users'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Usuarios' }

const roleColors: Record<string, string> = {
  SUPERADMIN: 'bg-red-100 text-red-800',
  AGENTE: 'bg-blue-100 text-blue-800',
  PROPIETARIO: 'bg-green-100 text-green-800',
  POSTULANTE: 'bg-gray-100 text-gray-800',
}

export default async function UsuariosPage() {
  let users: any[] = []
  try {
    users = await getUsers()
  } catch {
    // Supabase may not be configured yet
  }

  return (
    <RoleGuard allowedRoles={['SUPERADMIN']}>
      <PageHeader title="Usuarios" description="Administra los usuarios de la plataforma" />

      <div className="space-y-3">
        {users.map((user) => (
          <Card key={user.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center">
                    <span className="font-semibold text-navy text-sm">{user.full_name?.[0]?.toUpperCase() || '?'}</span>
                  </div>
                  <div>
                    <p className="font-medium">{user.full_name || 'Sin nombre'}</p>
                    <p className="text-sm text-muted-foreground">{user.phone || 'Sin telefono'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${roleColors[user.role] || ''}`}>
                    {user.role}
                  </span>
                  <span className="text-xs text-muted-foreground">{formatDate(user.created_at)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </RoleGuard>
  )
}
