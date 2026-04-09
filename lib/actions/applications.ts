'use server'

import { createClient } from '@/lib/supabase/server'
import { getUserProfile } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import type { SubscriberBrand } from '@/lib/utils/subscriber-brand'
import { buildSimpleBrandHeader, DEFAULT_BRAND } from '@/lib/utils/subscriber-brand'

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
  if (!['SUPERADMINBOSS', 'SUPERADMIN', 'AGENTE'].includes(profile.role)) return { error: 'No autorizado' }

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

/**
 * finalizeApplicationStatus — sets application to 'rented' or 'sold'
 * and syncs the related property to the same final status.
 * Called when admin manually finalizes from the application list.
 */
export async function finalizeApplicationStatus(
  applicationId: string,
  propertyId: string,
  newStatus: 'rented' | 'sold'
) {
  const profile = await getUserProfile()
  if (!profile) return { error: 'No autorizado' }

  const allowedRoles = ['SUPERADMINBOSS', 'SUPERADMIN', 'AGENTE']
  if (!allowedRoles.includes(profile.role)) return { error: 'No autorizado' }

  const { createAdminClient } = await import('@/lib/supabase/admin')
  const admin = createAdminClient()

  // 1. Update application status
  const { error: appErr } = await admin
    .from('applications')
    .update({ status: newStatus })
    .eq('id', applicationId)

  if (appErr) return { error: appErr.message }

  // 2. Sync property to the same final status
  const { error: propErr } = await admin
    .from('properties')
    .update({ status: newStatus })
    .eq('id', propertyId)

  if (propErr) return { error: propErr.message }

  // 3. Send confirmation email to applicant with bank details — non-blocking
  try {
    const resendKey = process.env.RESEND_API_KEY
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://altaprop-app.cl'

    if (resendKey) {
      // Fetch property title + owner_id + subscriber_id
      const { data: property } = await admin
        .from('properties')
        .select('id, title, owner_id, subscriber_id')
        .eq('id', propertyId)
        .single()

      // Fetch applicant profile + auth email
      const { data: application } = await admin
        .from('applications')
        .select('applicant_id, applicant:profiles!applications_applicant_id_fkey(id, full_name)')
        .eq('id', applicationId)
        .single()

      const applicantName = (application?.applicant as any)?.full_name || 'Postulante'

      // Fetch subscriber brand
      const { fetchSubscriberBrand } = await import('@/lib/utils/subscriber-brand')
      const brand = await fetchSubscriberBrand((property as any)?.subscriber_id, admin, siteUrl)

      // Fetch owner bank details
      let bankInfo: Record<string, string | null> | null = null
      if (property?.owner_id) {
        const { data: ownerBank } = await admin
          .from('profiles')
          .select('bank_name, bank_account_type, bank_account_holder, bank_account_rut, bank_account_number, bank_email')
          .eq('id', property.owner_id)
          .single()
        if (ownerBank && (ownerBank.bank_name || ownerBank.bank_account_holder || ownerBank.bank_account_number)) {
          bankInfo = ownerBank
        }
      }

      const { buildFinalizeEmail, buildOwnerFinalizeEmail } = await import('@/lib/emails/finalize-email')
      const isRent = newStatus === 'rented'

      // Send email to applicant
      if (application?.applicant_id) {
        const { data: authApplicant } = await admin.auth.admin.getUserById(application.applicant_id)
        const email = authApplicant?.user?.email
        if (email && property) {
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: `${brand.name} <noreply@altaprop-app.cl>`,
              to: email,
              subject: isRent
                ? `🔑 ¡Tu arriendo está confirmado! — ${property.title}`
                : `🏆 ¡Tu compra está confirmada! — ${property.title}`,
              html: buildFinalizeEmail(applicantName, property.title, newStatus, `${siteUrl}/dashboard/postulaciones`, bankInfo, brand),
            }),
          })
        }
      }

      // Send email to property owner
      if (property?.owner_id) {
        const { data: authOwner } = await admin.auth.admin.getUserById(property.owner_id)
        const ownerEmail = authOwner?.user?.email
        const { data: ownerProfile } = await admin.from('profiles').select('full_name').eq('id', property.owner_id).single()
        const ownerName = ownerProfile?.full_name || 'Propietario'
        if (ownerEmail && property) {
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: `${brand.name} <noreply@altaprop-app.cl>`,
              to: ownerEmail,
              subject: isRent
                ? `🔑 ¡Propiedad arrendada! — ${property.title}`
                : `🏆 ¡Propiedad vendida! — ${property.title}`,
              html: buildOwnerFinalizeEmail(ownerName, applicantName, property.title, `${siteUrl}/dashboard/propiedades/${propertyId}`, newStatus, brand),
            }),
          })
        }
      }
    }
  } catch {
    // Email failure never blocks the DB update
  }

  revalidatePath('/dashboard/postulaciones')
  revalidatePath('/dashboard/propiedades')
  return { success: true }
}

export async function approveApplication(applicationId: string) {
  const profile = await getUserProfile()
  if (!profile) return { error: 'No autorizado' }

  const allowedRoles = ['SUPERADMINBOSS', 'SUPERADMIN', 'AGENTE']
  if (!allowedRoles.includes(profile.role)) return { error: 'No autorizado' }

  const { createAdminClient } = await import('@/lib/supabase/admin')
  const admin = createAdminClient()

  // Get the application with property + applicant info
  const { data: app } = await admin
    .from('applications')
    .select('id, property_id, applicant_id, property:properties(id, title, owner_id, subscriber_id), applicant:profiles!applications_applicant_id_fkey(id, full_name)')
    .eq('id', applicationId)
    .single()

  if (!app) return { error: 'Postulación no encontrada' }

  // 1. Approve this application
  const { error: e1 } = await admin
    .from('applications')
    .update({ status: 'approved' })
    .eq('id', applicationId)
  if (e1) return { error: e1.message }

  // 2. Reject all other pending/reviewing applications for the same property
  await admin
    .from('applications')
    .update({ status: 'rejected' })
    .eq('property_id', app.property_id)
    .neq('id', applicationId)
    .in('status', ['pending', 'reviewing'])

  // 3. Set property status to reserved
  await admin
    .from('properties')
    .update({ status: 'reserved' })
    .eq('id', app.property_id)

  // 4. Send emails (applicant + property owner)
  try {
    const resendKey = process.env.RESEND_API_KEY
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://altaprop-app.cl'
    const propertyTitle = (app.property as any)?.title || 'la propiedad'
    const applicantName = (app.applicant as any)?.full_name || 'Postulante'
    const ownerId = (app.property as any)?.owner_id
    const subscriberId = (app.property as any)?.subscriber_id

    // Fetch subscriber brand for all emails in this action
    const { fetchSubscriberBrand } = await import('@/lib/utils/subscriber-brand')
    const brand = await fetchSubscriberBrand(subscriberId, admin, siteUrl)

    if (resendKey) {
      // 4a. Email to applicant
      if (app.applicant_id) {
        const { data: authApplicant } = await admin.auth.admin.getUserById(app.applicant_id)
        const applicantEmail = authApplicant?.user?.email
        if (applicantEmail) {
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: `${brand.name} <noreply@altaprop-app.cl>`,
              to: applicantEmail,
              subject: `🎉 ¡Tu postulación fue aprobada! — ${propertyTitle}`,
              html: buildApprovalEmail(applicantName, propertyTitle, `${siteUrl}/dashboard/postulaciones`, brand),
            }),
          })
        }
      }

      // 4b. Email to property owner
      if (ownerId) {
        const { data: authOwner } = await admin.auth.admin.getUserById(ownerId)
        const ownerEmail = authOwner?.user?.email
        const { data: ownerProfile } = await admin.from('profiles').select('full_name').eq('id', ownerId).single()
        const ownerName = ownerProfile?.full_name || 'Propietario'
        if (ownerEmail) {
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: `${brand.name} <noreply@altaprop-app.cl>`,
              to: ownerEmail,
              subject: `🏠 ¡Arrendatario aprobado para tu propiedad! — ${propertyTitle}`,
              html: buildOwnerApprovalEmail(ownerName, applicantName, propertyTitle, `${siteUrl}/dashboard/propiedades/${app.property_id}`, brand),
            }),
          })
        }
      }
    }
  } catch {
    // Email failure does not block the approval
  }

  revalidatePath('/dashboard/postulaciones')
  revalidatePath('/dashboard/propiedades')
  return { success: true, propertyId: app.property_id }
}

function buildApprovalEmail(name: string, propertyTitle: string, dashboardUrl: string, brand: SubscriberBrand = DEFAULT_BRAND): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:32px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

    <!-- HEADER -->
    ${buildSimpleBrandHeader(brand)}

    <!-- SUCCESS BANNER -->
    <div style="background:linear-gradient(135deg,#ecfdf5,#d1fae5);border-bottom:3px solid #10b981;padding:32px 40px;text-align:center;">
      <div style="font-size:52px;margin-bottom:12px;">🎉</div>
      <h2 style="color:#065f46;margin:0;font-size:26px;font-weight:700;">¡Postulación Aprobada!</h2>
      <p style="color:#047857;margin:8px 0 0;font-size:15px;">Tienes buenas noticias esperándote</p>
    </div>

    <!-- BODY -->
    <div style="padding:36px 40px;">
      <p style="color:#1a2332;font-size:16px;margin:0 0 8px;">Estimado/a <strong>${name}</strong>,</p>
      <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 24px;">
        Nos complace informarte que tu postulación para la propiedad
        <strong style="color:#1a2332;">"${propertyTitle}"</strong>
        ha sido <strong style="color:#10b981;">aprobada exitosamente</strong> por nuestro equipo.
      </p>

      <!-- DETAIL CARD -->
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-left:4px solid #c9a84c;border-radius:10px;padding:20px 24px;margin:0 0 28px;">
        <p style="margin:0 0 14px;font-size:11px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">Resumen de tu postulación</p>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:5px 0;color:#64748b;font-size:14px;width:120px;">Propiedad</td>
            <td style="padding:5px 0;color:#1a2332;font-size:14px;font-weight:600;">${propertyTitle}</td>
          </tr>
          <tr>
            <td style="padding:5px 0;color:#64748b;font-size:14px;">Estado</td>
            <td style="padding:5px 0;">
              <span style="background:#d1fae5;color:#065f46;font-size:13px;font-weight:700;padding:3px 12px;border-radius:20px;">✅ Aprobada</span>
            </td>
          </tr>
          <tr>
            <td style="padding:5px 0;color:#64748b;font-size:14px;">Reserva</td>
            <td style="padding:5px 0;color:#1a2332;font-size:14px;font-weight:600;">🔒 Exclusiva para ti</td>
          </tr>
        </table>
      </div>

      <!-- NEXT STEPS -->
      <h3 style="color:#1a2332;font-size:16px;font-weight:700;margin:0 0 16px;">¿Qué sigue ahora?</h3>

      <div style="margin-bottom:14px;display:flex;align-items:flex-start;">
        <div style="background:#c9a84c;color:#1a2332;width:26px;height:26px;border-radius:50%;font-size:13px;font-weight:800;text-align:center;line-height:26px;margin-right:14px;flex-shrink:0;">1</div>
        <p style="margin:0;color:#374151;font-size:14px;line-height:1.6;padding-top:3px;">
          Un ejecutivo de <strong>${brand.name}</strong> se pondrá en contacto contigo a la brevedad para coordinar los próximos pasos del proceso de arriendo.
        </p>
      </div>

      <div style="margin-bottom:14px;display:flex;align-items:flex-start;">
        <div style="background:#c9a84c;color:#1a2332;width:26px;height:26px;border-radius:50%;font-size:13px;font-weight:800;text-align:center;line-height:26px;margin-right:14px;flex-shrink:0;">2</div>
        <p style="margin:0;color:#374151;font-size:14px;line-height:1.6;padding-top:3px;">
          La propiedad ha sido <strong>reservada exclusivamente para ti</strong> mientras se completa el proceso. Nadie más puede postular.
        </p>
      </div>

      <div style="margin-bottom:32px;display:flex;align-items:flex-start;">
        <div style="background:#c9a84c;color:#1a2332;width:26px;height:26px;border-radius:50%;font-size:13px;font-weight:800;text-align:center;line-height:26px;margin-right:14px;flex-shrink:0;">3</div>
        <p style="margin:0;color:#374151;font-size:14px;line-height:1.6;padding-top:3px;">
          Puedes revisar el estado de tu postulación en cualquier momento desde tu panel personal.
        </p>
      </div>

      <!-- CTA BUTTON -->
      <div style="text-align:center;margin:0 0 28px;">
        <a href="${dashboardUrl}"
           style="background:#1a2332;color:#c9a84c;padding:15px 40px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block;letter-spacing:0.3px;">
          Ver mi Postulación →
        </a>
      </div>

      <p style="color:#64748b;font-size:14px;line-height:1.6;text-align:center;margin:0;">
        ¡Felicitaciones y bienvenido/a a tu nuevo hogar! 🏠<br>
        <strong style="color:#1a2332;">El equipo de ${brand.name}</strong>
      </p>
    </div>

    <!-- FOOTER -->
    <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 40px;text-align:center;">
      <p style="color:#94a3b8;font-size:12px;margin:0 0 4px;">
        Este correo fue enviado automáticamente por <strong style="color:#64748b;">${brand.name}</strong>
      </p>
      <p style="color:#cbd5e1;font-size:11px;margin:0;">
        <a href="${brand.siteUrl}" style="color:#94a3b8;text-decoration:none;">${brand.website}</a>
      </p>
    </div>

  </div>
</body>
</html>
  `
}

function buildOwnerApprovalEmail(ownerName: string, applicantName: string, propertyTitle: string, propertyUrl: string, brand: SubscriberBrand = DEFAULT_BRAND): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:32px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

    <!-- HEADER -->
    ${buildSimpleBrandHeader(brand)}

    <!-- SUCCESS BANNER -->
    <div style="background:linear-gradient(135deg,#fffbeb,#fef3c7);border-bottom:3px solid #c9a84c;padding:32px 40px;text-align:center;">
      <div style="font-size:52px;margin-bottom:12px;">🏠</div>
      <h2 style="color:#78350f;margin:0;font-size:24px;font-weight:700;">¡Arrendatario Aprobado!</h2>
      <p style="color:#92400e;margin:8px 0 0;font-size:15px;">Tu propiedad tiene un nuevo arrendatario</p>
    </div>

    <!-- BODY -->
    <div style="padding:36px 40px;">
      <p style="color:#1a2332;font-size:16px;margin:0 0 8px;">Estimado/a <strong>${ownerName}</strong>,</p>
      <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 24px;">
        Tenemos excelentes noticias para ti. Uno de los postulantes a tu propiedad
        <strong style="color:#1a2332;">"${propertyTitle}"</strong>
        ha sido <strong style="color:#c9a84c;">aprobado exitosamente</strong> por nuestro equipo tras revisar su documentación.
      </p>

      <!-- DETAIL CARD -->
      <div style="background:#fffbeb;border:1px solid #fde68a;border-left:4px solid #c9a84c;border-radius:10px;padding:20px 24px;margin:0 0 28px;">
        <p style="margin:0 0 14px;font-size:11px;color:#92400e;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">Resumen del proceso</p>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:5px 0;color:#78350f;font-size:14px;width:140px;">Propiedad</td>
            <td style="padding:5px 0;color:#1a2332;font-size:14px;font-weight:600;">${propertyTitle}</td>
          </tr>
          <tr>
            <td style="padding:5px 0;color:#78350f;font-size:14px;">Arrendatario</td>
            <td style="padding:5px 0;color:#1a2332;font-size:14px;font-weight:600;">👤 ${applicantName}</td>
          </tr>
          <tr>
            <td style="padding:5px 0;color:#78350f;font-size:14px;">Estado</td>
            <td style="padding:5px 0;">
              <span style="background:#d1fae5;color:#065f46;font-size:13px;font-weight:700;padding:3px 12px;border-radius:20px;">✅ Aprobado</span>
            </td>
          </tr>
          <tr>
            <td style="padding:5px 0;color:#78350f;font-size:14px;">Propiedad</td>
            <td style="padding:5px 0;">
              <span style="background:#fef3c7;color:#92400e;font-size:13px;font-weight:700;padding:3px 12px;border-radius:20px;">🔒 Reservada</span>
            </td>
          </tr>
        </table>
      </div>

      <!-- NEXT STEPS -->
      <h3 style="color:#1a2332;font-size:16px;font-weight:700;margin:0 0 16px;">¿Qué sigue ahora?</h3>

      <div style="margin-bottom:14px;display:flex;align-items:flex-start;">
        <div style="background:#1a2332;color:#c9a84c;width:26px;height:26px;border-radius:50%;font-size:13px;font-weight:800;text-align:center;line-height:26px;margin-right:14px;flex-shrink:0;">1</div>
        <p style="margin:0;color:#374151;font-size:14px;line-height:1.6;padding-top:3px;">
          Un ejecutivo de <strong>${brand.name}</strong> coordinará contigo y con el arrendatario los próximos pasos del proceso de firma y entrega de llaves.
        </p>
      </div>

      <div style="margin-bottom:14px;display:flex;align-items:flex-start;">
        <div style="background:#1a2332;color:#c9a84c;width:26px;height:26px;border-radius:50%;font-size:13px;font-weight:800;text-align:center;line-height:26px;margin-right:14px;flex-shrink:0;">2</div>
        <p style="margin:0;color:#374151;font-size:14px;line-height:1.6;padding-top:3px;">
          Tu propiedad ha sido marcada como <strong>Reservada</strong>. Las demás postulaciones han sido cerradas automáticamente.
        </p>
      </div>

      <div style="margin-bottom:32px;display:flex;align-items:flex-start;">
        <div style="background:#1a2332;color:#c9a84c;width:26px;height:26px;border-radius:50%;font-size:13px;font-weight:800;text-align:center;line-height:26px;margin-right:14px;flex-shrink:0;">3</div>
        <p style="margin:0;color:#374151;font-size:14px;line-height:1.6;padding-top:3px;">
          Puedes revisar el estado de tu propiedad y del proceso en cualquier momento desde tu panel de propietario.
        </p>
      </div>

      <!-- CTA BUTTON -->
      <div style="text-align:center;margin:0 0 28px;">
        <a href="${propertyUrl}"
           style="background:#c9a84c;color:#1a2332;padding:15px 40px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block;letter-spacing:0.3px;">
          Ver mi Propiedad →
        </a>
      </div>

      <p style="color:#64748b;font-size:14px;line-height:1.6;text-align:center;margin:0;">
        ¡Gracias por confiar en <strong style="color:#1a2332;">${brand.name}</strong> para gestionar tu propiedad!<br>
        <strong style="color:#1a2332;">El equipo de ${brand.name}</strong>
      </p>
    </div>

    <!-- FOOTER -->
    <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 40px;text-align:center;">
      <p style="color:#94a3b8;font-size:12px;margin:0 0 4px;">
        Este correo fue enviado automáticamente por <strong style="color:#64748b;">${brand.name}</strong>
      </p>
      <p style="color:#cbd5e1;font-size:11px;margin:0;">
        <a href="${brand.siteUrl}" style="color:#94a3b8;text-decoration:none;">${brand.website}</a>
      </p>
    </div>

  </div>
</body>
</html>
  `
}

export async function archiveApplication(id: string, archived: boolean) {
  const supabase = createClient()
  const { error } = await supabase
    .from('applications')
    .update({ archived } as any)
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

// ─── Rental contract ──────────────────────────────────────────────────────

export async function saveRentalContract(
  applicationId: string,
  contractUrl: string,
  contractName: string,
) {
  const profile = await getUserProfile()
  if (!profile) return { error: 'No autorizado' }
  const allowedRoles = ['SUPERADMINBOSS', 'SUPERADMIN', 'AGENTE']
  if (!allowedRoles.includes(profile.role)) return { error: 'No autorizado' }

  const { createAdminClient } = await import('@/lib/supabase/admin')
  const admin = createAdminClient()

  const { error } = await admin
    .from('applications')
    .update({ rental_contract_url: contractUrl, rental_contract_name: contractName })
    .eq('id', applicationId)

  if (error) return { error: error.message }
  revalidatePath('/dashboard/postulaciones')
  return { success: true }
}

export async function deleteRentalContract(applicationId: string, contractUrl: string) {
  const profile = await getUserProfile()
  if (!profile) return { error: 'No autorizado' }
  const allowedRoles = ['SUPERADMINBOSS', 'SUPERADMIN', 'AGENTE']
  if (!allowedRoles.includes(profile.role)) return { error: 'No autorizado' }

  const { createAdminClient } = await import('@/lib/supabase/admin')
  const admin = createAdminClient()

  try {
    const pathPart = contractUrl.split('/property-images/')[1]
    if (pathPart) {
      const supabase = createClient()
      await supabase.storage.from('property-images').remove([pathPart])
    }
  } catch {}

  const { error } = await admin
    .from('applications')
    .update({ rental_contract_url: null, rental_contract_name: null })
    .eq('id', applicationId)

  if (error) return { error: error.message }
  revalidatePath('/dashboard/postulaciones')
  return { success: true }
}

// ─── Commission payment ────────────────────────────────────────────────────

export async function saveCommissionAmount(
  applicationId: string,
  amount: number
): Promise<{ error?: string; success?: boolean }> {
  const profile = await getUserProfile()
  if (!profile) return { error: 'No autorizado' }
  const allowedRoles = ['SUPERADMINBOSS', 'SUPERADMIN', 'AGENTE']
  if (!allowedRoles.includes(profile.role)) return { error: 'No autorizado' }

  const { createAdminClient } = await import('@/lib/supabase/admin')
  const admin = createAdminClient()

  const { error } = await admin
    .from('applications')
    .update({ commission_amount: amount })
    .eq('id', applicationId)

  if (error) return { error: error.message }
  revalidatePath('/dashboard/postulaciones')
  return { success: true }
}
