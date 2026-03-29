'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import type { User } from '@supabase/supabase-js'

export function useUser() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (userId: string, email?: string) => {
    const supabase = createClient()
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    setProfile(data ? { ...data, email } : null)
  }, [])

  useEffect(() => {
    const supabase = createClient()

    // Try getSession first (fast, from cookie)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        setLoading(false)
        loadProfile(session.user.id, session.user.email)
      } else {
        // Fallback: try getUser (validates with server)
        supabase.auth.getUser().then(({ data: { user } }) => {
          setUser(user)
          setLoading(false)
          if (user) loadProfile(user.id, user.email)
        })
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const u = session?.user ?? null
        setUser(u)
        setLoading(false)
        if (u) {
          loadProfile(u.id, u.email)
        } else {
          setProfile(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [loadProfile])

  return { user, profile, loading }
}
