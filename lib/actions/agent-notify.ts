'use server'

import { getUserProfile } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildAgentAssignmentEmail, sendAgentEmail } from '@/lib/emails/agent-emails'

/**
 * Sends a "new property assigned" notification email to the specified agent.
 * Only SUPERADMIN and SUPERADMINBOSS can trigger this.
 */
export async function notifyAgentAssignment(propertyId: string, agentId: string) {
  const profile = await getUserProfile()
  if (!profile || !['SUPERADMIN', 'SUPERADMINBOSS'].includes(profile.role)) {
    return { error: 'No autorizado' }
  }

  const admin = createAdminClient()

  // Fetch property details
  const { data: property, error: propError } = await admin
    .from('properties')
    .select('id, title, price, currency, operation, address, city, sector')
    .eq('id', propertyId)
    .single()

  if (propError || !property) {
    return { error: 'Propiedad no encontrada' }
  }

  // Fetch agent auth email (stored in auth.users, not profiles)
  const { data: authData, error: authError } = await admin.auth.admin.getUserById(agentId)
  if (authError || !authData?.user?.email) {
    return { error: 'No se pudo obtener el email del agente' }
  }

  // Fetch agent profile for display name
  const { data: agentProfile } = await admin
    .from('profiles')
    .select('full_name')
    .eq('id', agentId)
    .single()

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.altaprop-app.cl'

  const { subject, html } = buildAgentAssignmentEmail({
    agentName:         agentProfile?.full_name || 'Agente',
    propertyTitle:     property.title,
    propertyAddress:   property.address,
    propertyCity:      property.city,
    propertySector:    property.sector,
    propertyPrice:     property.price,
    propertyCurrency:  property.currency,
    propertyOperation: property.operation,
    assignedByName:    profile.full_name || 'Administrador',
    dashboardUrl:      `${siteUrl}/dashboard/propiedades/${property.id}`,
  })

  try {
    await sendAgentEmail(authData.user.email, subject, html)
    return { success: true }
  } catch {
    return { error: 'Error al enviar el correo. Intenta de nuevo.' }
  }
}
