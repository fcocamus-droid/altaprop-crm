// Tiny HTML-escape helper for templated emails. Anywhere user-controlled text
// gets concatenated into an HTML string (e.g. brand names, prospect notes,
// property titles) it must run through this first — otherwise a contact who
// fills "<img src=x onerror=fetch(...)>" into a form turns the email into a
// payload delivery for the staff member who opens it.

const HTML_ESCAPE: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

export function escapeHtml(input: unknown): string {
  if (input === null || input === undefined) return ''
  return String(input).replace(/[&<>"']/g, ch => HTML_ESCAPE[ch] || ch)
}

/**
 * Sanitize text that's about to be placed in an email header (From, Subject,
 * Reply-To). Strips CR/LF so attackers can't smuggle additional headers via a
 * subscriber's full_name / brand name.
 */
export function sanitizeHeaderValue(input: unknown, maxLen = 120): string {
  if (input === null || input === undefined) return ''
  return String(input).replace(/[\r\n]+/g, ' ').trim().slice(0, maxLen)
}
