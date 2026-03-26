'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserProfile } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function getUsers() {
  const profile = await getUserProfile()
  if (!profile || profile.role !== 'SUPERADMIN') {
    return []
  }

  const supabase = createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return []
  return data || []
}

export async function createUser(data: {
  email: string
  password: string
  full_name: string
  phone: string
  role: string
}) {
  const profile = await getUserProfile()
  if (!profile || profile.role !== 'SUPERADMIN') {
    return { error: 'No autorizado' }
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
  if (!profile || profile.role !== 'SUPERADMIN') {
    return { error: 'No autorizado' }
  }

  const supabase = createClient()
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
  if (!profile || profile.role !== 'SUPERADMIN') {
    return { error: 'No autorizado' }
  }

  if (userId === profile.id) {
    return { error: 'No puedes eliminarte a ti mismo' }
  }

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.deleteUser(userId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/usuarios')
  return { success: true }
}
