'use server'

import { createClient } from '@/lib/supabase/server'
import { getUserProfile } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { isPropertyManager } from '@/lib/constants'

export async function createVisit(data: {
  property_id: string
  scheduled_at: string
  notes?: string
}) {
  const profile = await getUserProfile()
  if (!profile || !isPropertyManager(profile.role)) {
    return { error: 'No autorizado' }
  }

  const supabase = createClient()
  const { error } = await supabase.from('visits').insert({
    property_id: data.property_id,
    visitor_id: profile.id,
    subscriber_id: profile.subscriber_id || profile.id,
    scheduled_at: data.scheduled_at,
    notes: data.notes || null,
    status: 'pending',
  })

  if (error) return { error: error.message }
  revalidatePath('/dashboard/visitas')
  return { success: true }
}

export async function updateVisitStatus(visitId: string, status: string) {
  const profile = await getUserProfile()
  if (!profile || !isPropertyManager(profile.role)) {
    return { error: 'No autorizado' }
  }

  const supabase = createClient()
  const { error } = await supabase
    .from('visits')
    .update({ status })
    .eq('id', visitId)

  if (error) return { error: error.message }
  revalidatePath('/dashboard/visitas')
  return { success: true }
}

export async function deleteVisit(visitId: string) {
  const profile = await getUserProfile()
  if (!profile || !isPropertyManager(profile.role)) {
    return { error: 'No autorizado' }
  }

  const supabase = createClient()
  const { error } = await supabase
    .from('visits')
    .delete()
    .eq('id', visitId)

  if (error) return { error: error.message }
  revalidatePath('/dashboard/visitas')
  return { success: true }
}
