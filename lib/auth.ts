import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/types'

export const getSession = cache(async () => {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session
})

export const getUser = cache(async () => {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
})

export const getUserProfile = cache(async (): Promise<Profile | null> => {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Explicit column list — avoids fetching unused fields and reduces DB payload
  const PROFILE_COLUMNS = [
    'id', 'role', 'full_name', 'phone', 'rut', 'avatar_url',
    'plan', 'subscription_status', 'trial_ends_at', 'subscription_ends_at',
    'mp_subscription_id', 'max_agents', 'extra_agent_slots', 'subscriber_id',
    'created_at', 'updated_at',
    'bank_name', 'bank_account_type', 'bank_account_holder',
    'bank_account_rut', 'bank_account_number', 'bank_email',
    'ml_user_id', 'ml_access_token', 'ml_refresh_token',
    'ml_token_expires_at', 'ml_connected_at',
    'website_subdomain', 'website_domain', 'website_ns1', 'website_ns2',
    'website_enabled', 'website_primary_color', 'website_accent_color',
    'website_hero_title', 'website_hero_subtitle', 'website_about_text', 'website_whatsapp',
  ].join(', ')

  const { data } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('id', user.id)
    .single()

  if (!data) return null
  return { ...data, email: user.email } as Profile
})
