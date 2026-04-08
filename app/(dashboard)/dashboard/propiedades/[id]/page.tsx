import { getPropertyById } from '@/lib/queries/properties'
import { getUserProfile } from '@/lib/auth'
import { isAdmin, ADMIN_ROLES } from '@/lib/constants'
import { notFound, redirect } from 'next/navigation'
import { PageHeader } from '@/components/shared/page-header'
import { PropertyForm } from '@/components/properties/property-form'
import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Editar Propiedad' }

export default async function EditarPropiedadPage({ params }: { params: { id: string } }) {
  const profile = await getUserProfile()
  if (!profile) redirect('/login')

  const property = await getPropertyById(params.id)
  if (!property) notFound()

  // Only owner, agent from same subscriber, or admin can edit
  const sameSubscriber = profile.subscriber_id && property.subscriber_id && profile.subscriber_id === property.subscriber_id
  if (!isAdmin(profile.role) && !sameSubscriber && property.owner_id !== profile.id && property.agent_id !== profile.id) {
    redirect('/dashboard/propiedades')
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Editar Propiedad" description={property.title} />
      <PropertyForm property={property} />
    </div>
  )
}
