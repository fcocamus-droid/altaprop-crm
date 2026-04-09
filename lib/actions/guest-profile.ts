import { createAdminClient } from '@/lib/supabase/admin'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!

/**
 * Finds an existing auth user by email, or creates a new POSTULANTE account.
 * Returns the auth user id (= profile id).
 */
export async function findOrCreatePostulante(
  email: string,
  fullName: string,
  phone: string | null,
  rut: string | null,
): Promise<string> {
  const listRes = await fetch(
    `${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}&page=1&per_page=1`,
    { headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY } },
  )
  const listData = await listRes.json()
  const existing = listData.users?.[0]

  if (existing) return existing.id as string

  const createRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, email_confirm: true, user_metadata: { full_name: fullName } }),
  })
  const created = await createRes.json()
  if (!created.id) throw new Error('Error al crear perfil de visitante')

  const admin = createAdminClient()
  await admin.from('profiles').upsert({
    id:        created.id,
    full_name: fullName,
    phone:     phone ?? null,
    rut:       rut ?? null,
    role:      'POSTULANTE',
    plan:      'free',
    subscription_status: 'inactive',
    max_agents: 0,
  }, { onConflict: 'id' })

  return created.id as string
}
