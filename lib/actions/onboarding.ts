'use server'

import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function createOrganization(data: {
  companyName: string
  email: string
  password: string
  phone: string
  fullName: string
  plan: string
}) {
  // 1. Create auth user
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: true,
    user_metadata: { full_name: data.fullName, phone: data.phone, role: 'SUPERADMIN' },
  })
  if (authError) return { error: authError.message }

  // 2. Create slug from company name
  const slug = data.companyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 30)

  // 3. Check slug uniqueness
  const { data: existing } = await supabaseAdmin
    .from('organizations')
    .select('id')
    .eq('slug', slug)
    .single()
  const finalSlug = existing ? `${slug}-${Date.now().toString(36)}` : slug

  // 4. Create organization
  const maxAgents = data.plan === 'starter' ? 1 : data.plan === 'basico' ? 1 : data.plan === 'pro' ? 3 : 10
  const isStarter = data.plan === 'starter'
  const { data: org, error: orgError } = await supabaseAdmin
    .from('organizations')
    .insert({
      name: data.companyName,
      slug: finalSlug,
      plan: data.plan,
      subscription_status: isStarter ? 'unpaid' : 'trialing',
      max_agents: maxAgents,
      trial_ends_at: isStarter ? new Date().toISOString() : new Date(Date.now() + 14 * 86400000).toISOString(),
    })
    .select('id')
    .single()
  if (orgError) return { error: orgError.message }

  // 5. Create org member with ADMIN role
  await supabaseAdmin.from('org_members').insert({
    org_id: org.id,
    user_id: authData.user.id,
    org_role: 'ADMIN',
  })

  // 6. Update profile role
  await supabaseAdmin
    .from('profiles')
    .update({ role: 'SUPERADMIN' })
    .eq('id', authData.user.id)

  return { success: true, slug: finalSlug, orgId: org.id, requiresPayment: isStarter }
}
