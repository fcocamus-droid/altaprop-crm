'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserProfile } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { isAdmin, canModifyUser, getAllowedRolesForAdmin } from '@/lib/constants'

export async function getUsers() {
  const profile = await getUserProfile()
  if (!profile || !isAdmin(profile.role)) {
    return { users: [], profile }
  }

  const admin = createAdminClient()

  // Get profiles
  const { data: profiles, error } = await admin
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  if (error || !profiles) return { users: [], profile }

  // Get emails from auth.users using admin API
  const { data: authData } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const emailMap = new Map<string, string>()
  if (authData?.users) {
    for (const u of authData.users) {
      emailMap.set(u.id, u.email || '')
    }
  }

  // Merge email into profiles
  const usersWithEmail = profiles.map(p => ({
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
