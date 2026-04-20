'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserProfile } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { isAdmin, canModifyUser, getAllowedRolesForAdmin, ROLES } from '@/lib/constants'
import { getMaxAgents } from '@/lib/plan-features'

export async function getUsers() {
  const profile = await getUserProfile()
  if (!profile || !isAdmin(profile.role)) {
    return { users: [], profile }
  }

  const admin = createAdminClient()

  // SUPERADMINBOSS sees all, SUPERADMIN sees only their subscriber group
  // Exclude POSTULANTE and PROPIETARIO (managed in their own modules)
  let profilesQuery = admin.from('profiles').select('*').not('role', 'in', '("POSTULANTE","PROPIETARIO")').order('created_at', { ascending: false })
  if (profile.role === 'SUPERADMIN') {
    const subscriberId = profile.subscriber_id || profile.id
    profilesQuery = profilesQuery.eq('subscriber_id', subscriberId)
  }

  const [profilesResult, authResult] = await Promise.all([
    profilesQuery,
    admin.auth.admin.listUsers({ perPage: 100 }),
  ])

  if (profilesResult.error || !profilesResult.data) return { users: [], profile }

  const emailMap = new Map<string, string>()
  if (authResult.data?.users) {
    for (const u of authResult.data.users) {
      emailMap.set(u.id, u.email || '')
    }
  }

  const usersWithEmail = profilesResult.data.map(p => ({
    ...p,
    email: emailMap.get(p.id) || '',
  }))

  return { users: usersWithEmail, profile }
}

export async function createUser(data: {
  email: string
  password: string
  full_name: string
  phone: string
  role: string
}) {
  const profile = await getUserProfile()
  if (!profile || !isAdmin(profile.role)) {
    return { error: 'No autorizado' }
  }

  const allowed = getAllowedRolesForAdmin(profile.role)
  if (!allowed.some(r => r.value === data.role)) {
    return { error: 'No tienes permiso para asignar este rol' }
  }

  // Enforce max_agents limit for SUPERADMIN subscribers (base plan + extra purchased slots)
  if (profile.role === ROLES.SUPERADMIN && data.role === 'AGENTE') {
    const subscriberId = profile.subscriber_id || profile.id
    const admin = createAdminClient()
    // Fetch subscriber profile to get extra_agent_slots
    const { data: subscriberProfile } = await admin
      .from('profiles')
      .select('plan, extra_agent_slots')
      .eq('id', subscriberId)
      .single()
    const extraSlots = (subscriberProfile as any)?.extra_agent_slots ?? 0
    const effectivePlan = (subscriberProfile as any)?.plan ?? profile.plan
    const maxAgents = getMaxAgents(effectivePlan, extraSlots)
    const { count } = await admin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('subscriber_id', subscriberId)
      .eq('role', 'AGENTE')
    if ((count || 0) >= maxAgents) {
      return {
        error: `Límite de agentes alcanzado (${maxAgents}). Puedes contratar agentes adicionales por $25 USD + IVA/mes desde la página de Agentes.`,
        limitReached: true,
        maxAgents,
      }
    }
  }

  const admin = createAdminClient()
  const { data: newUser, error } = await admin.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: true,
    user_metadata: {
      full_name: data.full_name,
      phone: data.phone,
      role: data.role,
    },
  })

  if (error) return { error: error.message }

  // Assign subscriber_id to the new user's profile
  const subscriberId = profile.role === 'SUPERADMIN' ? (profile.subscriber_id || profile.id) : null
  if (subscriberId) {
    await admin.from('profiles').update({ subscriber_id: subscriberId }).eq('id', newUser.user.id)
  }

  revalidatePath('/dashboard/usuarios')
  return { success: true, userId: newUser.user.id }
}

export async function updateUserRole(userId: string, newRole: string) {
  const profile = await getUserProfile()
  if (!profile || !isAdmin(profile.role)) {
    return { error: 'No autorizado' }
  }

  const allowed = getAllowedRolesForAdmin(profile.role)
  if (!allowed.some(r => r.value === newRole)) {
    return { error: 'No tienes permiso para asignar este rol' }
  }

  const supabase = createClient()

  const { data: targetUser } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()

  if (targetUser && !canModifyUser(profile.role, targetUser.role)) {
    return { error: 'No tienes permiso para modificar este usuario' }
  }

  const { error } = await supabase
    .from('profiles')
    .update({ role: newRole })
    .eq('id', userId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/usuarios')
  return { success: true }
}

export async function updateUser(
  userId: string,
  data: { full_name: string; phone: string }
) {
  const profile = await getUserProfile()
  if (!profile || !isAdmin(profile.role)) {
    return { error: 'No autorizado' }
  }

  const admin = createAdminClient()
  const { data: targetUser } = await admin
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()

  if (targetUser && !canModifyUser(profile.role, targetUser.role)) {
    return { error: 'No tienes permiso para modificar este usuario' }
  }

  const { error } = await admin
    .from('profiles')
    .update({ full_name: data.full_name || null, phone: data.phone || null })
    .eq('id', userId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/usuarios')
  return { success: true }
}

export async function deleteUser(userId: string) {
  const profile = await getUserProfile()
  if (!profile || !isAdmin(profile.role)) {
    return { error: 'No autorizado' }
  }

  if (userId === profile.id) {
    return { error: 'No puedes eliminarte a ti mismo' }
  }

  const supabase = createClient()
  const { data: targetUser } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()

  if (targetUser && !canModifyUser(profile.role, targetUser.role)) {
    return { error: 'No tienes permiso para eliminar este usuario' }
  }

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.deleteUser(userId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/usuarios')
  return { success: true }
}

export async function assignPropietarioToSubscriber(
  propietarioId: string,
  subscriberId: string | null
) {
  const profile = await getUserProfile()
  if (!profile || profile.role !== ROLES.SUPERADMINBOSS) {
    return { error: 'No autorizado' }
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('profiles')
    .update({ subscriber_id: subscriberId })
    .eq('id', propietarioId)
    .eq('role', 'PROPIETARIO')

  if (error) return { error: error.message }

  // Bulk-update all existing properties owned by this propietario so they
  // immediately appear (or disappear) in the subscriber's panel without
  // requiring the propietario to re-upload them.
  const { error: propError } = await admin
    .from('properties')
    .update({ subscriber_id: subscriberId })
    .eq('owner_id', propietarioId)

  if (propError) return { error: propError.message }

  revalidatePath('/dashboard/base-propietarios')
  revalidatePath('/dashboard/propiedades')
  return { success: true }
}

export async function assignPropietarioAgent(
  propietarioId: string,
  agentId: string | null
) {
  const profile = await getUserProfile()
  if (!profile || !isAdmin(profile.role)) {
    return { error: 'No autorizado' }
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('profiles')
    .update({ agent_id: agentId } as any)
    .eq('id', propietarioId)
    .eq('role', 'PROPIETARIO')

  if (error) return { error: error.message }

  revalidatePath('/dashboard/base-propietarios')
  return { success: true }
}

// ─── Extra Agent Slot add-on ──────────────────────────────────────────────────

/**
 * Subscriber requests an extra agent slot ($25 USD + IVA/mes).
 * Creates a pending request that SUPERADMINBOSS can approve.
 */
export async function requestExtraAgentSlot() {
  const profile = await getUserProfile()
  if (!profile || profile.role !== ROLES.SUPERADMIN) {
    return { error: 'Solo los suscriptores pueden solicitar agentes adicionales' }
  }

  const subscriberId = profile.subscriber_id || profile.id
  const admin = createAdminClient()

  // Check there's no pending request already
  const { data: existing } = await admin
    .from('agent_slot_requests' as any)
    .select('id, status')
    .eq('subscriber_id', subscriberId)
    .eq('status', 'pending')
    .maybeSingle()

  if (existing) {
    return { error: 'Ya tienes una solicitud de agente adicional pendiente de aprobación. Te contactaremos pronto.' }
  }

  const { error } = await admin
    .from('agent_slot_requests' as any)
    .insert({
      subscriber_id: subscriberId,
      slots_requested: 1,
      price_usd: 25,
      status: 'pending',
    })

  if (error) return { error: 'No se pudo registrar la solicitud. Intenta de nuevo.' }

  revalidatePath('/dashboard/usuarios')
  return { success: true }
}

/**
 * SUPERADMINBOSS approves an agent slot request → increments extra_agent_slots on the subscriber.
 */
export async function approveAgentSlotRequest(requestId: string) {
  const profile = await getUserProfile()
  if (!profile || profile.role !== ROLES.SUPERADMINBOSS) {
    return { error: 'No autorizado' }
  }

  const admin = createAdminClient()

  const { data: request, error: fetchError } = await admin
    .from('agent_slot_requests' as any)
    .select('*')
    .eq('id', requestId)
    .eq('status', 'pending')
    .single()

  if (fetchError || !request) {
    return { error: 'Solicitud no encontrada o ya procesada' }
  }

  const req = request as any

  const { data: subProfile } = await admin
    .from('profiles')
    .select('extra_agent_slots')
    .eq('id', req.subscriber_id)
    .single()

  const currentExtra = (subProfile as any)?.extra_agent_slots ?? 0

  await admin
    .from('profiles')
    .update({ extra_agent_slots: currentExtra + req.slots_requested } as any)
    .eq('id', req.subscriber_id)

  await admin
    .from('agent_slot_requests' as any)
    .update({ status: 'approved', reviewed_by: profile.id, reviewed_at: new Date().toISOString() })
    .eq('id', requestId)

  revalidatePath('/dashboard/usuarios')
  revalidatePath('/dashboard/suscriptores')
  return { success: true }
}
