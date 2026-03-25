import { RoleGuard } from '@/components/auth/role-guard'
import { PageHeader } from '@/components/shared/page-header'
import { PropertyForm } from '@/components/properties/property-form'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Nueva Propiedad' }

export default function NuevaPropiedadPage() {
  return (
    <RoleGuard allowedRoles={['SUPERADMIN', 'AGENTE', 'PROPIETARIO']}>
      <PageHeader title="Nueva Propiedad" description="Completa los datos para publicar tu propiedad" />
      <PropertyForm />
    </RoleGuard>
  )
}
