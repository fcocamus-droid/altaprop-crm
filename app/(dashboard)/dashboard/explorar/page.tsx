import { getProperties } from '@/lib/queries/properties'
import { getUserProfile } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/shared/page-header'
import { ExplorarPropiedades } from '@/components/properties/explorar-propiedades'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Explorar Propiedades - Altaprop' }

export default async function ExplorarPage() {
  const profile = await getUserProfile()
  if (!profile) redirect('/login')

  let properties: any[] = []
  try {
    properties = await getProperties()
  } catch {
    // Supabase may not be configured yet
  }

  return (
    <div>
      <PageHeader
        title="Explorar Propiedades"
        description="Busca propiedades disponibles y postula"
      />
      <ExplorarPropiedades properties={properties} />
    </div>
  )
}
