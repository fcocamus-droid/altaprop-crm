import { getPropertyById } from '@/lib/queries/properties'
import { getUserProfile } from '@/lib/auth'
import { isAdmin, ROLES } from '@/lib/constants'
import { notFound, redirect } from 'next/navigation'
import { PageHeader } from '@/components/shared/page-header'
import { PropertyForm } from '@/components/properties/property-form'
import { PropertyPortals } from '@/components/portals/property-portals'
import { createClient } from '@/lib/supabase/server'
import { isMLCommune } from '@/lib/ml/communes'
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
    try {
      const supabase = createClient()
      // select * so query doesn't fail if migration 023 hasn't run yet
      const { data: subscriberProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', property.subscriber_id)
        .single()
      subscriberConnected = !!(subscriberProfile as any)?.ml_user_id
    } catch {
      // Migration not yet applied — portals widget shows "connect account" CTA
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Editar Propiedad" description={property.title} />
      <PropertyForm property={property} />
      {canManagePortals && (() => {
        const hasLocation = !!(property.sector || property.city || property.address)
        const locationMapped = !hasLocation ||
          isMLCommune(property.sector || '') ||
          isMLCommune(property.city || '')
        return (
          <PropertyPortals
            propertyId={property.id}
            mlItemId={property.ml_item_id}
            mlStatus={property.ml_status}
            mlListingType={property.ml_listing_type}
            subscriberConnected={subscriberConnected}
            property={{
              title: property.title,
              price: property.price,
              sqm: property.sqm,
              covered_sqm: (property as any).covered_sqm,
              bedrooms: property.bedrooms,
              bathrooms: property.bathrooms,
              city: property.city,
              sector: property.sector,
              address: property.address,
              images: (property as any).images || [],
              locationMapped,
            }}
          />
        )
      })()}
    </div>
  )
}
