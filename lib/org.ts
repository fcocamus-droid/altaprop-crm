import { cookies } from 'next/headers'

export function getCurrentOrgId(): string | null {
  try {
    const cookieStore = cookies()
    return cookieStore.get('x-org-id')?.value || null
  } catch {
    return null
  }
}

export function getCurrentOrgSlug(): string | null {
  try {
    const cookieStore = cookies()
    return cookieStore.get('x-org-slug')?.value || null
  } catch {
    return null
  }
}
