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

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!data) return null
  return { ...data, email: user.email } as Profile
})
