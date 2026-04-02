import { getPropertyById } from '@/lib/queries/properties'
import { getUserProfile } from '@/lib/auth'
import { isAdmin, ADMIN_ROLES } from '@/lib/constants'
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

  // Check if subscriber has ML connected
  let subscriberConnected = !!(profile as any).ml_access_token
  if (!subscriberConnected && profile.subscriber_id) {
    const supabase = createClient()
    const { data: subProfile } = await supabase
      .from('profiles')
      .select('ml_access_token')
      .eq('id', profile.subscriber_id)
      .single()
    subscriberConnected = !!(subProfile as any)?.ml_access_token
  }

  // Show portals widget for admins and agents, not for PROPIETARIO role
  const showPortals = ADMIN_ROLES.includes(profile.role as any) || profile.role === 'AGENTE'

  return (
    <div className="space-y-6">
      <PageHeader title="Editar Propiedad" description={property.title} />
      <PropertyForm property={property} />
      {showPortals && (
        <PropertyPortals
          propertyId={property.id}
          mlItemId={(property as any).ml_item_id}
          mlStatus={(property as any).ml_status}
          mlListingType={(property as any).ml_listing_type}
          subscriberConnected={subscriberConnected}
        />
      )}
    </div>
  )
}
