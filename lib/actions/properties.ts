'use server'

import { createClient } from '@/lib/supabase/server'
import { getUserProfile } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { propertySchema } from '@/lib/validations/property'
import { isPropertyManager, ROLES } from '@/lib/constants'

export async function createProperty(formData: FormData) {
  const profile = await getUserProfile()
  if (!profile || !isPropertyManager(profile.role)) {
    return { error: 'No autorizado' }
  }

  const raw = Object.fromEntries(formData.entries())
  const parsed = propertySchema.safeParse(raw)

  if (!parsed.success) {
    return { error: parsed.error.errors[0].message }
  }

  const supabase = createClient()

  // Enforce property limit for Started plan (5 properties max)
  if (profile.role !== ROLES.SUPERADMINBOSS && profile.plan === 'started') {
    const subscriberId = profile.subscriber_id || profile.id
    const { count } = await supabase
      .from('properties')
      .select('id', { count: 'exact', head: true })
      .eq('subscriber_id', subscriberId)
    if ((count || 0) >= 5) {
      return { error: 'Limite de propiedades alcanzado (5). Mejora tu plan para agregar mas.' }
    }
  }

  // Use temp ID if images were uploaded from client
  const tempId = formData.get('temp_property_id') as string

  // Fields outside propertySchema (arrays / booleans handled separately)
  const websiteVisible = (formData.get('website_visible') ?? 'true') === 'true'
  const amenitiesRaw = formData.get('amenities_json') as string
  const amenities: string[] = amenitiesRaw ? JSON.parse(amenitiesRaw) : []

  // Delete images explicitly removed in the editor
  const deletedImagesRaw = formData.get('deleted_image_ids') as string
  const deletedIds: string[] = deletedImagesRaw ? JSON.parse(deletedImagesRaw) : []
  if (deletedIds.length > 0) {
    await supabase.from('property_images').delete().in('id', deletedIds)
  }

  const { data, error } = await supabase
    .from('properties')
    .insert({
      ...parsed.data,
      ...(tempId ? { id: tempId } : {}),
      owner_id: profile.id,
      subscriber_id: profile.subscriber_id || profile.id,
      website_visible: websiteVisible,
      amenities,
      ...(profile.role === ROLES.AGENTE ? { agent_id: profile.id } : {}),
    } as any)
    .select('id')
    .single()

  if (error) {
    return { error: error.message }
  }

  // Handle image URLs (uploaded from client directly to Storage)
  const imageUrlsJson = formData.get('image_urls') as string
  if (imageUrlsJson) {
    const imageUrls = JSON.parse(imageUrlsJson) as string[]
    if (imageUrls.length > 0) {
      const records = imageUrls.map((url, i) => ({ property_id: data.id, url, order: i }))
      await supabase.from('property_images').insert(records)
    }
  }

  // Fallback: handle file uploads (for cases without client upload)
  const images = formData.getAll('images') as File[]
  if (!imageUrlsJson && images.length > 0 && images[0].size > 0) {
    const uploadPromises = images.map(async (file, i) => {
      const ext = file.name.split('.').pop()
      const filePath = `${data.id}/${Date.now()}-${i}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('property-images')
        .upload(filePath, file)
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('property-images').getPublicUrl(filePath)
        return { property_id: data.id, url: urlData.publicUrl, order: i }
      }
      return null
    })
    const results = (await Promise.all(uploadPromises)).filter(Boolean)
    if (results.length > 0) {
      await supabase.from('property_images').insert(results)
    }
  }

  revalidatePath('/dashboard/propiedades')
  revalidatePath('/propiedades')
  redirect('/dashboard/propiedades')
}

export async function updateProperty(id: string, formData: FormData) {
  const profile = await getUserProfile()
  if (!profile) return { error: 'No autorizado' }

  const raw = Object.fromEntries(formData.entries())
  const parsed = propertySchema.safeParse(raw)

  if (!parsed.success) {
    return { error: parsed.error.errors[0].message }
  }

  const supabase = createClient()

  const websiteVisible = (formData.get('website_visible') ?? 'true') === 'true'
  const amenitiesRaw = formData.get('amenities_json') as string
  const amenities: string[] = amenitiesRaw ? JSON.parse(amenitiesRaw) : []

  // Delete images explicitly removed in the editor
  const deletedImagesRaw = formData.get('deleted_image_ids') as string
  const deletedIds: string[] = deletedImagesRaw ? JSON.parse(deletedImagesRaw) : []
  if (deletedIds.length > 0) {
    await supabase.from('property_images').delete().in('id', deletedIds)
  }

  const { error } = await supabase
    .from('properties')
    .update({ ...parsed.data, website_visible: websiteVisible, amenities } as any)
    .eq('id', id)

  if (error) return { error: error.message }

  // Handle image URLs (uploaded from client)
  const imageUrlsJson = formData.get('image_urls') as string
  if (imageUrlsJson) {
    const imageUrls = JSON.parse(imageUrlsJson) as string[]
    if (imageUrls.length > 0) {
      const records = imageUrls.map((url, i) => ({ property_id: id, url, order: i }))
      await supabase.from('property_images').insert(records)
    }
  }

  // Fallback: handle file uploads
  const images = formData.getAll('images') as File[]
  if (!imageUrlsJson && images.length > 0 && images[0].size > 0) {
    const uploadPromises = images.map(async (file, i) => {
      const ext = file.name.split('.').pop()
      const filePath = `${id}/${Date.now()}-${i}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('property-images')
        .upload(filePath, file)
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('property-images').getPublicUrl(filePath)
        return { property_id: id, url: urlData.publicUrl, order: i }
      }
      return null
    })
    const results = (await Promise.all(uploadPromises)).filter(Boolean)
    if (results.length > 0) {
      await supabase.from('property_images').insert(results)
    }
  }

  revalidatePath('/dashboard/propiedades')
  revalidatePath(`/propiedades/${id}`)
  revalidatePath('/propiedades')
  return { success: true }
}

export async function deleteProperty(id: string) {
  const supabase = createClient()

  // Delete images from storage
  const { data: images } = await supabase
    .from('property_images')
    .select('url')
    .eq('property_id', id)

  if (images) {
    for (const img of images) {
      const path = img.url.split('/property-images/')[1]
      if (path) {
        await supabase.storage.from('property-images').remove([path])
      }
    }
  }

  const { error } = await supabase.from('properties').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/dashboard/propiedades')
  revalidatePath('/propiedades')
  return { success: true }
}

export async function updatePropertyStatus(id: string, status: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('properties')
    .update({ status })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/propiedades')
  revalidatePath('/propiedades')
  return { success: true }
}

export async function updatePropertyAgent(propertyId: string, agentId: string | null) {
  const profile = await getUserProfile()
  if (!profile || !isPropertyManager(profile.role)) {
    return { error: 'No autorizado' }
  }

  const supabase = createClient()
  const { error } = await supabase
    .from('properties')
    .update({ agent_id: agentId || null })
    .eq('id', propertyId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/propiedades')
  return { success: true }
}

export async function importProperty(propertyData: {
  title: string
  description: string
  type: string
  operation: string
  price: number
  currency: string
  address: string
  city: string
  sector: string
  bedrooms: number
  bathrooms: number
  sqm: number
  images: string[]
}) {
  const profile = await getUserProfile()
  if (!profile || !isPropertyManager(profile.role)) {
    return { error: 'No autorizado' }
  }

  const supabase = createClient()

  const { data, error } = await supabase
    .from('properties')
    .insert({
      title: propertyData.title,
      description: propertyData.description,
      type: propertyData.type || 'departamento',
      operation: propertyData.operation || 'arriendo',
      price: propertyData.price || 0,
      currency: propertyData.currency || 'CLP',
      address: propertyData.address || '',
      city: propertyData.city || '',
      sector: propertyData.sector || '',
      bedrooms: propertyData.bedrooms || 0,
      bathrooms: propertyData.bathrooms || 0,
      sqm: propertyData.sqm || 0,
      owner_id: profile.id,
      subscriber_id: profile.subscriber_id || profile.id,
      status: 'available',
      featured: false,
      // Auto-assign to the agent who imported the property
      ...(profile.role === ROLES.AGENTE ? { agent_id: profile.id } : {}),
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  // Save image URLs (external URLs from Portal Inmobiliario)
  if (propertyData.images?.length > 0) {
    const imageRecords = propertyData.images.slice(0, 10).map((url, i) => ({
      property_id: data.id,
      url,
      order: i,
    }))

    await supabase.from('property_images').insert(imageRecords)
  }

  revalidatePath('/dashboard/propiedades')
  revalidatePath('/propiedades')
  return { success: true, propertyId: data.id }
}

// ─── FINALIZE PROPERTY (reserved → rented | sold) with confirmation email ────

export async function finalizeProperty(propertyId: string, newStatus: 'rented' | 'sold') {
  const profile = await getUserProfile()
  if (!profile) return { error: 'No autorizado' }
  const allowedRoles = ['SUPERADMINBOSS', 'SUPERADMIN', 'AGENTE']
  if (!allowedRoles.includes(profile.role)) return { error: 'No autorizado' }

  const { createAdminClient } = await import('@/lib/supabase/admin')
  const admin = createAdminClient()

  // 1. Update property status
  const { data: property, error: propError } = await admin
    .from('properties')
    .update({ status: newStatus })
    .eq('id', propertyId)
    .select('id, title, owner_id, operation')
    .single()

  if (propError || !property) return { error: propError?.message || 'Propiedad no encontrada' }

  // 2. Update the approved application status to match (rented or sold)
  await admin
    .from('applications')
    .update({ status: newStatus })
    .eq('property_id', propertyId)
    .eq('status', 'approved')

  // 3. Send emails — non-blocking
  try {
    const resendKey = process.env.RESEND_API_KEY
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://altaprop-app.cl'

    if (resendKey) {
      // Find the approved applicant
      const { data: approvedApp } = await admin
        .from('applications')
        .select('applicant_id, applicant:profiles!applications_applicant_id_fkey(id, full_name)')
        .eq('property_id', propertyId)
        .eq('status', newStatus)
        .maybeSingle()

      const applicantName = (approvedApp?.applicant as any)?.full_name || 'Postulante'

      // Fetch owner bank details to include in applicant email
      let bankInfo: BankInfo | null = null
      if (property.owner_id) {
        const { data: ownerBank } = await admin
          .from('profiles')
          .select('bank_name, bank_account_type, bank_account_holder, bank_account_rut, bank_account_number, bank_email')
          .eq('id', property.owner_id)
          .single()
        if (ownerBank && (ownerBank.bank_name || ownerBank.bank_account_holder || ownerBank.bank_account_number)) {
          bankInfo = ownerBank as BankInfo
        }
      }

      const { buildFinalizeEmail, buildOwnerFinalizeEmail } = await import('@/lib/emails/finalize-email')
      const isRent = newStatus === 'rented'

      // 2a. Email to applicant (with bank details)
      if (approvedApp?.applicant_id) {
        const { data: authApplicant } = await admin.auth.admin.getUserById(approvedApp.applicant_id)
        const email = authApplicant?.user?.email
        if (email) {
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: 'Altaprop <noreply@altaprop-app.cl>',
              to: email,
              subject: isRent
                ? `🔑 ¡Tu arriendo está confirmado! — ${property.title}`
                : `🏆 ¡Tu compra está confirmada! — ${property.title}`,
              html: buildFinalizeEmail(applicantName, property.title, newStatus, `${siteUrl}/dashboard/postulaciones`, bankInfo),
            }),
          })
        }
      }

      // 2b. Email to property owner
      if (property.owner_id) {
        const { data: authOwner } = await admin.auth.admin.getUserById(property.owner_id)
        const ownerEmail = authOwner?.user?.email
        const { data: ownerProfile } = await admin.from('profiles').select('full_name').eq('id', property.owner_id).single()
        const ownerName = ownerProfile?.full_name || 'Propietario'
        if (ownerEmail) {
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: 'Altaprop <noreply@altaprop-app.cl>',
              to: ownerEmail,
              subject: isRent
                ? `🔑 ¡Propiedad arrendada! — ${property.title}`
                : `🏆 ¡Propiedad vendida! — ${property.title}`,
              html: buildOwnerFinalizeEmail(ownerName, applicantName, property.title, `${siteUrl}/dashboard/propiedades/${propertyId}`, newStatus),
            }),
          })
        }
      }
    }
  } catch {
    // Email failure never blocks DB update
  }

  revalidatePath('/dashboard/base-propietarios')
  revalidatePath('/dashboard/propiedades')
  revalidatePath('/propiedades')
  return { success: true }
}

// ── Bank info type ────────────────────────────────────────────────────────────
interface BankInfo {
  bank_name?: string | null
  bank_account_type?: string | null
  bank_account_holder?: string | null
  bank_account_rut?: string | null
  bank_account_number?: string | null
  bank_email?: string | null
}

function buildBankSection(bank: BankInfo, accentColor: string, bgColor: string, borderColor: string): string {
  const rows = [
    bank.bank_name         ? `<tr><td style="padding:6px 0;color:${accentColor};font-size:14px;width:160px;">Banco</td><td style="padding:6px 0;color:#1a2332;font-size:14px;font-weight:600;">${bank.bank_name}</td></tr>` : '',
    bank.bank_account_type ? `<tr><td style="padding:6px 0;color:${accentColor};font-size:14px;">Tipo de cuenta</td><td style="padding:6px 0;color:#1a2332;font-size:14px;font-weight:600;">${bank.bank_account_type}</td></tr>` : '',
    bank.bank_account_holder ? `<tr><td style="padding:6px 0;color:${accentColor};font-size:14px;">Nombre destinatario</td><td style="padding:6px 0;color:#1a2332;font-size:14px;font-weight:600;">${bank.bank_account_holder}</td></tr>` : '',
    bank.bank_account_rut  ? `<tr><td style="padding:6px 0;color:${accentColor};font-size:14px;">RUT destinatario</td><td style="padding:6px 0;color:#1a2332;font-size:14px;font-weight:600;">${bank.bank_account_rut}</td></tr>` : '',
    bank.bank_account_number ? `<tr><td style="padding:6px 0;color:${accentColor};font-size:14px;">Número de cuenta</td><td style="padding:6px 0;color:#1a2332;font-size:14px;font-weight:600;">${bank.bank_account_number}</td></tr>` : '',
    bank.bank_email        ? `<tr><td style="padding:6px 0;color:${accentColor};font-size:14px;">Correo electrónico</td><td style="padding:6px 0;color:#1a2332;font-size:14px;font-weight:600;">${bank.bank_email}</td></tr>` : '',
  ].filter(Boolean).join('')

  if (!rows) return ''

  return `
    <div style="background:${bgColor};border:1px solid ${borderColor};border-left:4px solid ${accentColor};border-radius:10px;padding:20px 24px;margin:0 0 28px;">
      <p style="margin:0 0 6px;font-size:11px;color:${accentColor};font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">🏦 Datos para el Pago</p>
      <p style="margin:0 0 14px;font-size:13px;color:#374151;">Realiza la transferencia a la siguiente cuenta bancaria del propietario:</p>
      <table style="width:100%;border-collapse:collapse;">${rows}</table>
      <p style="margin:14px 0 0;font-size:12px;color:#64748b;">También puedes encontrar estos datos en tu <a href="#" style="color:${accentColor};">panel de postulaciones</a> junto al botón para subir tu comprobante de pago.</p>
    </div>`
}

// ── EMAIL: Rental confirmation → applicant ───────────────────────────────────
function buildRentalConfirmEmail(name: string, propertyTitle: string, dashboardUrl: string, bank?: BankInfo | null): string {
  return `
<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:600px;margin:32px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

  <!-- HEADER -->
  <div style="background:#1a2332;padding:28px 40px;text-align:center;">
    <h1 style="color:#c9a84c;margin:0;font-size:26px;font-weight:800;letter-spacing:2px;">ALTAPROP</h1>
    <p style="color:#6b7f96;margin:4px 0 0;font-size:12px;letter-spacing:1px;text-transform:uppercase;">CRM Inmobiliario</p>
  </div>

  <!-- BANNER -->
  <div style="background:linear-gradient(135deg,#eff6ff,#dbeafe);border-bottom:3px solid #3b82f6;padding:32px 40px;text-align:center;">
    <div style="font-size:52px;margin-bottom:12px;">🔑</div>
    <h2 style="color:#1e3a8a;margin:0;font-size:26px;font-weight:700;">¡Arriendo Confirmado!</h2>
    <p style="color:#1d4ed8;margin:8px 0 0;font-size:15px;">Bienvenido/a a tu nuevo hogar</p>
  </div>

  <!-- BODY -->
  <div style="padding:36px 40px;">
    <p style="color:#1a2332;font-size:16px;margin:0 0 8px;">Estimado/a <strong>${name}</strong>,</p>
    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 24px;">
      ¡Excelentes noticias! El arriendo de la propiedad
      <strong style="color:#1a2332;">"${propertyTitle}"</strong>
      ha sido <strong style="color:#1d4ed8;">confirmado oficialmente</strong> a tu nombre.
    </p>

    <!-- DETAIL CARD -->
    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-left:4px solid #3b82f6;border-radius:10px;padding:20px 24px;margin:0 0 28px;">
      <p style="margin:0 0 14px;font-size:11px;color:#1e40af;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">Detalle del Arriendo</p>
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:5px 0;color:#1e40af;font-size:14px;width:140px;">Propiedad</td>
          <td style="padding:5px 0;color:#1a2332;font-size:14px;font-weight:600;">${propertyTitle}</td>
        </tr>
        <tr>
          <td style="padding:5px 0;color:#1e40af;font-size:14px;">Arrendatario</td>
          <td style="padding:5px 0;color:#1a2332;font-size:14px;font-weight:600;">👤 ${name}</td>
        </tr>
        <tr>
          <td style="padding:5px 0;color:#1e40af;font-size:14px;">Estado</td>
          <td style="padding:5px 0;">
            <span style="background:#dbeafe;color:#1e3a8a;font-size:13px;font-weight:700;padding:3px 12px;border-radius:20px;">🔑 Arrendada</span>
          </td>
        </tr>
      </table>
    </div>

    ${bank ? buildBankSection(bank, '#1d4ed8', '#eff6ff', '#bfdbfe') : ''}

    <!-- NEXT STEPS -->
    <h3 style="color:#1a2332;font-size:16px;font-weight:700;margin:0 0 16px;">Próximos pasos</h3>
    <div style="margin-bottom:14px;display:flex;align-items:flex-start;">
      <div style="background:#1a2332;color:#c9a84c;width:26px;height:26px;border-radius:50%;font-size:13px;font-weight:800;text-align:center;line-height:26px;margin-right:14px;flex-shrink:0;">1</div>
      <p style="margin:0;color:#374151;font-size:14px;line-height:1.6;padding-top:3px;">${bank ? 'Realiza la transferencia con los datos bancarios indicados arriba y sube tu comprobante de pago en tu panel.' : 'Un ejecutivo de <strong>Altaprop</strong> se pondrá en contacto contigo para coordinar la firma del contrato y la entrega de llaves.'}</p>
    </div>
    <div style="margin-bottom:14px;display:flex;align-items:flex-start;">
      <div style="background:#1a2332;color:#c9a84c;width:26px;height:26px;border-radius:50%;font-size:13px;font-weight:800;text-align:center;line-height:26px;margin-right:14px;flex-shrink:0;">2</div>
      <p style="margin:0;color:#374151;font-size:14px;line-height:1.6;padding-top:3px;">Revisa tu correo y tu panel para cualquier documento o instrucción adicional que necesitemos de tu parte.</p>
    </div>
    <div style="margin-bottom:32px;display:flex;align-items:flex-start;">
      <div style="background:#1a2332;color:#c9a84c;width:26px;height:26px;border-radius:50%;font-size:13px;font-weight:800;text-align:center;line-height:26px;margin-right:14px;flex-shrink:0;">3</div>
      <p style="margin:0;color:#374151;font-size:14px;line-height:1.6;padding-top:3px;">Puedes seguir el estado de tu postulación en cualquier momento desde tu panel personal.</p>
    </div>

    <!-- CTA -->
    <div style="text-align:center;margin:0 0 28px;">
      <a href="${dashboardUrl}" style="background:#1a2332;color:#c9a84c;padding:15px 40px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block;">Ver mi Panel →</a>
    </div>
    <p style="color:#64748b;font-size:14px;line-height:1.6;text-align:center;margin:0;">
      ¡Felicitaciones y bienvenido/a a tu nuevo hogar!<br><strong style="color:#1a2332;">El equipo de Altaprop</strong>
    </p>
  </div>

  <!-- FOOTER -->
  <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 40px;text-align:center;">
    <p style="color:#94a3b8;font-size:12px;margin:0;"><a href="https://altaprop-app.cl" style="color:#94a3b8;text-decoration:none;">altaprop-app.cl</a></p>
  </div>
</div>
</body></html>`
}

// ── EMAIL: Sale confirmation → applicant ─────────────────────────────────────
function buildSaleConfirmEmail(name: string, propertyTitle: string, dashboardUrl: string, bank?: BankInfo | null): string {
  return `
<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:600px;margin:32px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

  <div style="background:#1a2332;padding:28px 40px;text-align:center;">
    <h1 style="color:#c9a84c;margin:0;font-size:26px;font-weight:800;letter-spacing:2px;">ALTAPROP</h1>
    <p style="color:#6b7f96;margin:4px 0 0;font-size:12px;letter-spacing:1px;text-transform:uppercase;">CRM Inmobiliario</p>
  </div>

  <div style="background:linear-gradient(135deg,#faf5ff,#ede9fe);border-bottom:3px solid #7c3aed;padding:32px 40px;text-align:center;">
    <div style="font-size:52px;margin-bottom:12px;">🏆</div>
    <h2 style="color:#4c1d95;margin:0;font-size:26px;font-weight:700;">¡Compra Confirmada!</h2>
    <p style="color:#5b21b6;margin:8px 0 0;font-size:15px;">¡Tu nueva propiedad te espera!</p>
  </div>

  <div style="padding:36px 40px;">
    <p style="color:#1a2332;font-size:16px;margin:0 0 8px;">Estimado/a <strong>${name}</strong>,</p>
    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 24px;">
      ¡Felicitaciones! La compra de la propiedad
      <strong style="color:#1a2332;">"${propertyTitle}"</strong>
      ha sido <strong style="color:#7c3aed;">confirmada oficialmente</strong> a tu nombre.
    </p>

    <div style="background:#faf5ff;border:1px solid #ddd6fe;border-left:4px solid #7c3aed;border-radius:10px;padding:20px 24px;margin:0 0 28px;">
      <p style="margin:0 0 14px;font-size:11px;color:#4c1d95;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">Detalle de la Compra</p>
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:5px 0;color:#4c1d95;font-size:14px;width:140px;">Propiedad</td>
          <td style="padding:5px 0;color:#1a2332;font-size:14px;font-weight:600;">${propertyTitle}</td>
        </tr>
        <tr>
          <td style="padding:5px 0;color:#4c1d95;font-size:14px;">Comprador/a</td>
          <td style="padding:5px 0;color:#1a2332;font-size:14px;font-weight:600;">👤 ${name}</td>
        </tr>
        <tr>
          <td style="padding:5px 0;color:#4c1d95;font-size:14px;">Estado</td>
          <td style="padding:5px 0;">
            <span style="background:#ede9fe;color:#4c1d95;font-size:13px;font-weight:700;padding:3px 12px;border-radius:20px;">🏆 Vendida</span>
          </td>
        </tr>
      </table>
    </div>

    ${bank ? buildBankSection(bank, '#7c3aed', '#faf5ff', '#ddd6fe') : ''}

    <div style="text-align:center;margin:0 0 28px;">
      <a href="${dashboardUrl}" style="background:#1a2332;color:#c9a84c;padding:15px 40px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block;">Ver mi Panel →</a>
    </div>
    <p style="color:#64748b;font-size:14px;line-height:1.6;text-align:center;margin:0;">
      ¡Bienvenido/a a tu nueva propiedad!<br><strong style="color:#1a2332;">El equipo de Altaprop</strong>
    </p>
  </div>
  <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 40px;text-align:center;">
    <p style="color:#94a3b8;font-size:12px;margin:0;"><a href="https://altaprop-app.cl" style="color:#94a3b8;text-decoration:none;">altaprop-app.cl</a></p>
  </div>
</div>
</body></html>`
}

// ── EMAIL: Rental notification → property owner ──────────────────────────────
function buildOwnerRentalConfirmEmail(ownerName: string, applicantName: string, propertyTitle: string, propertyUrl: string): string {
  return `
<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:600px;margin:32px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

  <div style="background:#1a2332;padding:28px 40px;text-align:center;">
    <h1 style="color:#c9a84c;margin:0;font-size:26px;font-weight:800;letter-spacing:2px;">ALTAPROP</h1>
    <p style="color:#6b7f96;margin:4px 0 0;font-size:12px;letter-spacing:1px;text-transform:uppercase;">CRM Inmobiliario</p>
  </div>

  <div style="background:linear-gradient(135deg,#eff6ff,#dbeafe);border-bottom:3px solid #3b82f6;padding:32px 40px;text-align:center;">
    <div style="font-size:52px;margin-bottom:12px;">🔑</div>
    <h2 style="color:#1e3a8a;margin:0;font-size:24px;font-weight:700;">¡Propiedad Arrendada!</h2>
    <p style="color:#1d4ed8;margin:8px 0 0;font-size:15px;">Tu propiedad ya tiene arrendatario confirmado</p>
  </div>

  <div style="padding:36px 40px;">
    <p style="color:#1a2332;font-size:16px;margin:0 0 8px;">Estimado/a <strong>${ownerName}</strong>,</p>
    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 24px;">
      ¡Felicitaciones! Tu propiedad <strong style="color:#1a2332;">"${propertyTitle}"</strong>
      ha sido arrendada exitosamente. El proceso de cierre ha sido completado por nuestro equipo.
    </p>

    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-left:4px solid #3b82f6;border-radius:10px;padding:20px 24px;margin:0 0 28px;">
      <p style="margin:0 0 14px;font-size:11px;color:#1e40af;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">Resumen del cierre</p>
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:5px 0;color:#1e40af;font-size:14px;width:140px;">Propiedad</td>
          <td style="padding:5px 0;color:#1a2332;font-size:14px;font-weight:600;">${propertyTitle}</td>
        </tr>
        <tr>
          <td style="padding:5px 0;color:#1e40af;font-size:14px;">Arrendatario</td>
          <td style="padding:5px 0;color:#1a2332;font-size:14px;font-weight:600;">👤 ${applicantName}</td>
        </tr>
        <tr>
          <td style="padding:5px 0;color:#1e40af;font-size:14px;">Estado</td>
          <td style="padding:5px 0;">
            <span style="background:#dbeafe;color:#1e3a8a;font-size:13px;font-weight:700;padding:3px 12px;border-radius:20px;">🔑 Arrendada</span>
          </td>
        </tr>
      </table>
    </div>

    <div style="text-align:center;margin:0 0 28px;">
      <a href="${propertyUrl}" style="background:#c9a84c;color:#1a2332;padding:15px 40px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block;">Ver mi Propiedad →</a>
    </div>
    <p style="color:#64748b;font-size:14px;line-height:1.6;text-align:center;margin:0;">
      ¡Gracias por confiar en <strong style="color:#1a2332;">Altaprop</strong>!<br><strong style="color:#1a2332;">El equipo de Altaprop</strong>
    </p>
  </div>
  <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 40px;text-align:center;">
    <p style="color:#94a3b8;font-size:12px;margin:0;"><a href="https://altaprop-app.cl" style="color:#94a3b8;text-decoration:none;">altaprop-app.cl</a></p>
  </div>
</div>
</body></html>`
}

// ── EMAIL: Sale notification → property owner ────────────────────────────────
function buildOwnerSaleConfirmEmail(ownerName: string, applicantName: string, propertyTitle: string, propertyUrl: string): string {
  return `
<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:600px;margin:32px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

  <div style="background:#1a2332;padding:28px 40px;text-align:center;">
    <h1 style="color:#c9a84c;margin:0;font-size:26px;font-weight:800;letter-spacing:2px;">ALTAPROP</h1>
    <p style="color:#6b7f96;margin:4px 0 0;font-size:12px;letter-spacing:1px;text-transform:uppercase;">CRM Inmobiliario</p>
  </div>

  <div style="background:linear-gradient(135deg,#faf5ff,#ede9fe);border-bottom:3px solid #7c3aed;padding:32px 40px;text-align:center;">
    <div style="font-size:52px;margin-bottom:12px;">🏆</div>
    <h2 style="color:#4c1d95;margin:0;font-size:24px;font-weight:700;">¡Propiedad Vendida!</h2>
    <p style="color:#5b21b6;margin:8px 0 0;font-size:15px;">El proceso de venta fue completado exitosamente</p>
  </div>

  <div style="padding:36px 40px;">
    <p style="color:#1a2332;font-size:16px;margin:0 0 8px;">Estimado/a <strong>${ownerName}</strong>,</p>
    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 24px;">
      ¡Felicitaciones! Tu propiedad <strong style="color:#1a2332;">"${propertyTitle}"</strong>
      ha sido vendida exitosamente. El proceso de cierre ha sido completado por nuestro equipo.
    </p>

    <div style="background:#faf5ff;border:1px solid #ddd6fe;border-left:4px solid #7c3aed;border-radius:10px;padding:20px 24px;margin:0 0 28px;">
      <p style="margin:0 0 14px;font-size:11px;color:#4c1d95;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">Resumen del cierre</p>
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:5px 0;color:#4c1d95;font-size:14px;width:140px;">Propiedad</td>
          <td style="padding:5px 0;color:#1a2332;font-size:14px;font-weight:600;">${propertyTitle}</td>
        </tr>
        <tr>
          <td style="padding:5px 0;color:#4c1d95;font-size:14px;">Comprador/a</td>
          <td style="padding:5px 0;color:#1a2332;font-size:14px;font-weight:600;">👤 ${applicantName}</td>
        </tr>
        <tr>
          <td style="padding:5px 0;color:#4c1d95;font-size:14px;">Estado</td>
          <td style="padding:5px 0;">
            <span style="background:#ede9fe;color:#4c1d95;font-size:13px;font-weight:700;padding:3px 12px;border-radius:20px;">🏆 Vendida</span>
          </td>
        </tr>
      </table>
    </div>

    <div style="text-align:center;margin:0 0 28px;">
      <a href="${propertyUrl}" style="background:#c9a84c;color:#1a2332;padding:15px 40px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block;">Ver mi Propiedad →</a>
    </div>
    <p style="color:#64748b;font-size:14px;line-height:1.6;text-align:center;margin:0;">
      ¡Gracias por confiar en <strong style="color:#1a2332;">Altaprop</strong>!<br><strong style="color:#1a2332;">El equipo de Altaprop</strong>
    </p>
  </div>
  <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 40px;text-align:center;">
    <p style="color:#94a3b8;font-size:12px;margin:0;"><a href="https://altaprop-app.cl" style="color:#94a3b8;text-decoration:none;">altaprop-app.cl</a></p>
  </div>
</div>
</body></html>`
}

// ─────────────────────────────────────────────────────────────────────────────

export async function deletePropertyImage(imageId: string, url: string) {
  const supabase = createClient()

  const path = url.split('/property-images/')[1]
  if (path) {
    await supabase.storage.from('property-images').remove([path])
  }

  const { error } = await supabase.from('property_images').delete().eq('id', imageId)
  if (error) return { error: error.message }

  revalidatePath('/dashboard/propiedades')
  return { success: true }
}

// ─────────────────────────────────────────────────────────────────────────────

export async function updatePropertyWebsiteVisibility(id: string, website_visible: boolean) {
  const profile = await getUserProfile()
  if (!profile || !isPropertyManager(profile.role)) return { error: 'No autorizado' }

  const supabase = createClient()
  const { error } = await supabase
    .from('properties')
    .update({ website_visible } as any)
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/propiedades')
  revalidatePath('/dashboard/mi-sitio')
  return { success: true }
}
