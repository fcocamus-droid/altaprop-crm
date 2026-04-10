import { getPropertyById } from '@/lib/queries/properties'
import { getUserProfile } from '@/lib/auth'
import { isAdmin, ROLES } from '@/lib/constants'
import { notFound, redirect } from 'next/navigation'
import { PageHeader } from '@/components/shared/page-header'
import { PropertyForm } from '@/components/properties/property-form'
import { PropertyPortals } from '@/components/portals/property-portals'
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

  // Determine if the subscriber (org owner) has ML connected
  // Agents/admins belong to a subscriber org; check that org's ML connection
  let subscriberConnected = false
  const canManagePortals = isAdmin(profile.role) || profile.role === ROLES.AGENTE
  if (canManagePortals && property.subscriber_id) {
    const supabase = createClient()
    const { data: subscriberProfile } = await supabase
      .from('profiles')
      .select('ml_user_id')
      .eq('id', property.subscriber_id)
      .single()
    subscriberConnected = !!subscriberProfile?.ml_user_id
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Editar Propiedad" description={property.title} />
      <PropertyForm property={property} />
      {canManagePortals && (
        <PropertyPortals
          propertyId={property.id}
          mlItemId={property.ml_item_id}
          mlStatus={property.ml_status}
          mlListingType={property.ml_listing_type}
          subscriberConnected={subscriberConnected}
        />
      )}
    </div>
  )
}
