import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(price: number, currency: string = 'CLP'): string {
  if (currency === 'UF') return `${price.toLocaleString('es-CL')} UF`
  if (currency === 'USD') return `US$${price.toLocaleString('es-CL')}`
  return `$${price.toLocaleString('es-CL')}`
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('es-CL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString('es-CL', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Converts any YouTube URL format to the embeddable /embed/ URL.
 * Passes non-YouTube URLs through unchanged (Matterport, Vimeo, etc.).
 *
 * Handled formats:
 *   https://www.youtube.com/watch?v=ID[&...]
 *   https://youtu.be/ID[?...]
 *   https://www.youtube.com/embed/ID  → unchanged
 */
export function toEmbedUrl(url: string): string {
  if (!url) return url
  try {
    const u = new URL(url)
    // youtu.be/ID short link
    if (u.hostname === 'youtu.be') {
      const id = u.pathname.slice(1).split('/')[0]
      return `https://www.youtube.com/embed/${id}`
    }
    // youtube.com/watch?v=ID
    if ((u.hostname === 'www.youtube.com' || u.hostname === 'youtube.com') && u.pathname === '/watch') {
      const id = u.searchParams.get('v')
      if (id) return `https://www.youtube.com/embed/${id}`
    }
  } catch {
    // malformed URL — return as-is
  }
  return url
}
