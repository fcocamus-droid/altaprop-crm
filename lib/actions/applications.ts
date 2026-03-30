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

  revalidatePath('/dashboard/postulaciones')
  return { success: true, applicationId: application.id }
}

export async function uploadApplicationDocument(applicationId: string, formData: FormData) {
  const profile = await getUserProfile()
  if (!profile) return { error: 'No autorizado' }

  const supabase = createClient()

  // Verify ownership or admin access
  const { data: app } = await supabase
    .from('applications')
    .select('applicant_id')
    .eq('id', applicationId)
    .single()

  if (!app) return { error: 'Postulación no encontrada' }
  if (app.applicant_id !== profile.id && profile.role !== 'SUPERADMIN' && profile.role !== 'SUPERADMINBOSS') {
    return { error: 'No autorizado' }
  }

  const file = formData.get('file') as File
  const docType = formData.get('doc_type') as string

  if (!file || file.size === 0) return { error: 'Archivo requerido' }

  const ext = file.name.split('.').pop()
  const filePath = `${applicationId}/${Date.now()}-${docType}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('application-documents')
    .upload(filePath, file)

  if (uploadError) return { error: uploadError.message }

  const { data: urlData } = supabase.storage
    .from('application-documents')
    .getPublicUrl(filePath)

  const { data: doc, error: insertError } = await supabase
    .from('application_documents')
    .insert({
      application_id: applicationId,
      name: file.name,
      url: urlData.publicUrl,
      type: docType,
    })
    .select('id, name, url, type')
    .single()

  if (insertError) return { error: insertError.message }

  revalidatePath(`/dashboard/postulaciones/${applicationId}`)
  return { success: true, document: doc }
}

export async function deleteApplicationDocument(docId: string) {
  const profile = await getUserProfile()
  if (!profile) return { error: 'No autorizado' }

  // Use admin client to bypass RLS
  const { createAdminClient } = await import('@/lib/supabase/admin')
  const admin = createAdminClient()

  const { data: doc } = await admin
    .from('application_documents')
    .select('url, application_id, application:applications(applicant_id)')
    .eq('id', docId)
    .single()

  if (!doc) return { error: 'Documento no encontrado' }

  const applicantId = (doc.application as any)?.applicant_id
  if (applicantId !== profile.id && profile.role !== 'SUPERADMIN' && profile.role !== 'SUPERADMINBOSS') {
    return { error: 'No autorizado' }
  }

  // Delete from storage
  const path = doc.url.split('/application-documents/')[1]
  if (path) {
    await admin.storage.from('application-documents').remove([path])
  }

  const { error } = await admin.from('application_documents').delete().eq('id', docId)
  if (error) return { error: error.message }

  revalidatePath(`/dashboard/postulaciones/${doc.application_id}`)
  revalidatePath('/dashboard/postulaciones')
  return { success: true }
}

export async function updateApplicationStatus(id: string, status: string) {
  const profile = await getUserProfile()
  if (!profile) return { error: 'No autorizado' }

  const { createAdminClient } = await import('@/lib/supabase/admin')
  const admin = createAdminClient()

  const { error } = await admin
    .from('applications')
    .update({ status })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/postulaciones')
  return { success: true }
}

export async function deleteApplication(id: string) {
  const supabase = createClient()

  const { data: docs } = await supabase
    .from('application_documents')
    .select('url')
    .eq('application_id', id)

  if (docs) {
    const paths = docs.map(d => d.url.split('/application-documents/')[1]).filter(Boolean)
    if (paths.length > 0) {
      await supabase.storage.from('application-documents').remove(paths)
    }
  }

  const { error } = await supabase.from('applications').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/dashboard/postulaciones')
  return { success: true }
}
