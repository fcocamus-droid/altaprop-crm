'use server'

import { createClient } from '@/lib/supabase/server'
import { getUserProfile } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function createApplication(formData: FormData) {
  const profile = await getUserProfile()
  if (!profile || profile.role !== 'POSTULANTE') {
    return { error: 'Solo postulantes pueden aplicar' }
  }

  const propertyId = formData.get('property_id') as string
  const message = formData.get('message') as string

  if (!propertyId || !message) {
    return { error: 'Completa todos los campos requeridos' }
  }

  const supabase = createClient()

  // Check for existing application
  const { data: existing } = await supabase
    .from('applications')
    .select('id')
    .eq('property_id', propertyId)
    .eq('applicant_id', profile.id)
    .single()

  if (existing) {
    return { error: 'Ya tienes una postulacion para esta propiedad' }
  }

  // Create application
  const { data: application, error } = await supabase
    .from('applications')
    .insert({
      property_id: propertyId,
      applicant_id: profile.id,
      message,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  // Handle document uploads
  const documents = formData.getAll('documents') as File[]
  const docTypes = formData.getAll('doc_types') as string[]

  for (let i = 0; i < documents.length; i++) {
    const file = documents[i]
    if (file.size === 0) continue

    const ext = file.name.split('.').pop()
    const filePath = `${application.id}/${Date.now()}-${i}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('application-documents')
      .upload(filePath, file)

    if (!uploadError) {
      const { data: urlData } = supabase.storage
        .from('application-documents')
        .getPublicUrl(filePath)

      await supabase.from('application_documents').insert({
        application_id: application.id,
        name: file.name,
        url: urlData.publicUrl,
        type: docTypes[i] || 'otro',
      })
    }
  }

  revalidatePath('/dashboard/postulaciones')
  return { success: true, applicationId: application.id }
}

export async function updateApplicationStatus(id: string, status: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('applications')
    .update({ status })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/postulaciones')
  return { success: true }
}

export async function deleteApplication(id: string) {
  const supabase = createClient()

  // Delete documents from storage
  const { data: docs } = await supabase
    .from('application_documents')
    .select('url')
    .eq('application_id', id)

  if (docs) {
    for (const doc of docs) {
      const path = doc.url.split('/application-documents/')[1]
      if (path) {
        await supabase.storage.from('application-documents').remove([path])
      }
    }
  }

  const { error } = await supabase.from('applications').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/dashboard/postulaciones')
  return { success: true }
}
