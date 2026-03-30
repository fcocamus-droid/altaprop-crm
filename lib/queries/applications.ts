import { createClient } from '@/lib/supabase/server'
import type { Application } from '@/types'

export async function getApplicationsByApplicant(applicantId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('applications')
    .select('*, property:properties(id, title, address, city, type, operation, price, currency), documents:application_documents(*)')
    .eq('applicant_id', applicantId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []) as Application[]
}

export async function getApplicationsByProperty(propertyId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('applications')
    .select('*, applicant:profiles!applications_applicant_id_fkey(id, full_name, phone, email:id), documents:application_documents(*)')
    .eq('property_id', propertyId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []) as Application[]
}

export async function getApplicationsByOwner(ownerId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('applications')
    .select('*, property:properties!inner(id, title, owner_id), applicant:profiles!applications_applicant_id_fkey(full_name, phone), documents:application_documents(*)')
    .eq('property.owner_id', ownerId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []) as Application[]
}

export async function getAllApplications() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('applications')
    .select('*, property:properties(id, title), applicant:profiles!applications_applicant_id_fkey(full_name, phone), documents:application_documents(*)')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []) as Application[]
}

export async function getApplicationsByAgent(agentId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('applications')
    .select('*, property:properties!inner(id, title, agent_id), applicant:profiles!applications_applicant_id_fkey(full_name, phone), documents:application_documents(*)')
    .eq('property.agent_id', agentId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []) as Application[]
}

export async function getApplicationsBySubscriber(subscriberId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('applications')
    .select('*, property:properties!inner(id, title, subscriber_id), applicant:profiles!applications_applicant_id_fkey(full_name, phone), documents:application_documents(*)')
    .eq('property.subscriber_id', subscriberId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []) as Application[]
}

export async function getApplicationById(id: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('applications')
    .select('*, property:properties(id, title, address, city, type, operation, price, currency, owner_id), applicant:profiles!applications_applicant_id_fkey(id, full_name, phone, avatar_url), documents:application_documents(*)')
    .eq('id', id)
    .single()

  if (error) return null
  return data as Application
}

export async function getApplicationStatsByAgent(agentId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('applications')
    .select('status, property:properties!inner(agent_id)')
    .eq('property.agent_id', agentId)

  if (error) return { total: 0, pending: 0, reviewing: 0, approved: 0, rejected: 0 }
  const items = data || []
  return {
    total: items.length,
    pending: items.filter(a => a.status === 'pending').length,
    reviewing: items.filter(a => a.status === 'reviewing').length,
    approved: items.filter(a => a.status === 'approved').length,
    rejected: items.filter(a => a.status === 'rejected').length,
  }
}

export async function getApplicationStats(ownerId?: string, subscriberId?: string) {
  const supabase = createClient()
  let query = supabase.from('applications').select('status, property:properties!inner(owner_id, subscriber_id)')

  if (subscriberId) {
    query = query.eq('property.subscriber_id', subscriberId)
  } else if (ownerId) {
    query = query.eq('property.owner_id', ownerId)
  }

  const { data, error } = await query
  if (error) return { total: 0, pending: 0, reviewing: 0, approved: 0, rejected: 0 }

  const items = data || []
  return {
    total: items.length,
    pending: items.filter(a => a.status === 'pending').length,
    reviewing: items.filter(a => a.status === 'reviewing').length,
    approved: items.filter(a => a.status === 'approved').length,
    rejected: items.filter(a => a.status === 'rejected').length,
  }
}
