import { getUserProfile } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { ADMIN_ROLES, ROLES } from '@/lib/constants'
import { ConversationsInbox } from '@/components/inbox/conversations-inbox'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Conversaciones - Altaprop' }

export default async function ConversacionesPage() {
  const profile = await getUserProfile()
  if (!profile) redirect('/login')

  const allowed = [...ADMIN_ROLES, ROLES.AGENTE]
  if (!allowed.includes(profile.role as any)) redirect('/dashboard')

  return (
    <div className="h-[calc(100vh-100px)] -mx-4 -my-4 md:-mx-6">
      <ConversationsInbox currentUserRole={profile.role} currentUserId={profile.id} />
    </div>
  )
}
