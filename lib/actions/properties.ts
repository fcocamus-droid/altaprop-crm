'use server'

import { createClient } from '@/lib/supabase/server'
import { getUserProfile } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { propertySchema } from '@/lib/validations/property'

export async function createProperty(formData: FormData) {
  const profile = await getUserProfile()
  if (!profile || !['SUPERADMIN', 'AGENTE', 'PROPIETARIO'].includes(profile.role)) {
    return { error: 'No autorizado' }
  }

  const raw = Object.fromEntries(formData.entries())
  const parsed = propertySchema.safeParse(raw)

  if (!parsed.success) {
    return { error: parsed.error.errors[0].message }
  }

  const supabase = createClient()
  const { data, error } = await supabase
    .from('properties')
    .insert({
      ...parsed.data,
      owner_id: profile.id,
    })
    .select('id')
    .single()

  if (error) {
    return { error: error.message }
  }

  // Handle image uploads
  const images = formData.getAll('images') as File[]
  if (images.length > 0 && images[0].size > 0) {
    for (let i = 0; i < images.length; i++) {
      const file = images[i]
      const ext = file.name.split('.').pop()
      const filePath = `${data.id}/${Date.now()}-${i}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('property-images')
        .upload(filePath, file)

      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from('property-images')
          .getPublicUrl(filePath)

        await supabase.from('property_images').insert({
          property_id: data.id,
          url: urlData.publicUrl,
          order: i,
        })
      }
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
  const { error } = await supabase
    .from('properties')
    .update(parsed.data)
    .eq('id', id)

  if (error) return { error: error.message }

  // Handle new image uploads
  const images = formData.getAll('images') as File[]
  if (images.length > 0 && images[0].size > 0) {
    for (let i = 0; i < images.length; i++) {
      const file = images[i]
      const ext = file.name.split('.').pop()
      const filePath = `${id}/${Date.now()}-${i}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('property-images')
        .upload(filePath, file)

      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from('property-images')
          .getPublicUrl(filePath)

        await supabase.from('property_images').insert({
          property_id: id,
          url: urlData.publicUrl,
          order: i,
        })
      }
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
  if (!profile || !['SUPERADMIN', 'AGENTE', 'PROPIETARIO'].includes(profile.role)) {
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
      status: 'available',
      featured: false,
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
