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

  // Enforce max_agents limit for SUPERADMIN subscribers
  if (profile.role === ROLES.SUPERADMIN && data.role === 'AGENTE') {
    const maxAgents = getMaxAgents(profile.plan)
    const subscriberId = profile.subscriber_id || profile.id
    const admin = createAdminClient()
    const { count } = await admin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('subscriber_id', subscriberId)
      .eq('role', 'AGENTE')
    if ((count || 0) >= maxAgents) {
      return { error: `Limite de agentes alcanzado (${maxAgents}). Mejora tu plan para agregar mas.` }
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

  revalidatePath('/dashboard/base-propietarios')
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
