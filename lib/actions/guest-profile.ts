import { createAdminClient } from '@/lib/supabase/admin'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!

/**
 * Finds an existing auth user by email, paginating through all users.
 * Supabase Admin API does NOT support filtering listUsers by email — the `?email=`
 * query param is ignored, so we must paginate and match in memory.
 */
async function findUserIdByEmail(email: string): Promise<string | null> {
  const target = email.trim().toLowerCase()
  for (let page = 1; page <= 25; page++) {
    const res = await fetch(
      `${SUPABASE_URL}/auth/v1/admin/users?page=${page}&per_page=200`,
      { headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY } },
    )
    const data = await res.json()
    const users = data.users || []
    const found = users.find((u: any) => (u.email || '').toLowerCase() === target)
    if (found) return found.id as string
    if (users.length < 200) return null   // last page
  }
  return null
}

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
  const existingId = await findUserIdByEmail(email)
  if (existingId) return existingId

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
