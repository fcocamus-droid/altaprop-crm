import { RoleGuard } from '@/components/auth/role-guard'
import { PROPERTY_MANAGER_ROLES } from '@/lib/constants'
import { PageHeader } from '@/components/shared/page-header'
import { PropertyForm } from '@/components/properties/property-form'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Nueva Propiedad' }

export default function NuevaPropiedadPage() {
  return (
    <RoleGuard allowedRoles={PROPERTY_MANAGER_ROLES}>
      <PageHeader title="Nueva Propiedad" description="Completa los datos para publicar tu propiedad" />
      <PropertyForm />
    </RoleGuard>
  )
}
