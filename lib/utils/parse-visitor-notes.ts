/**
 * Pure string-parsing helper, safe to import from client components.
 * Lives in its own file (instead of visit-pdf.ts) to avoid pulling in
 * the server-only `pdfkit` dependency on the client bundle.
 */
export function parseVisitorFromNotes(notes: string | null) {
  if (!notes) return { name: '', rut: '', phone: '', email: '', observation: '' }
  const nameMatch = notes.match(/Solicitud de:\s*([^|]+)/)
  const rutMatch  = notes.match(/RUT:\s*([^|]+)/)
  const telMatch  = notes.match(/Tel:\s*([^|]+)/)
  const emailMatch= notes.match(/Email:\s*([^|]+)/)
  let obs = notes
  obs = obs.replace(/Solicitud de:\s*[^|]+\|?\s*/gi, '')
  obs = obs.replace(/RUT:\s*[^|]+\|?\s*/gi, '')
  obs = obs.replace(/Tel:\s*[^|]+\|?\s*/gi, '')
  obs = obs.replace(/Email:\s*[^|]+\|?\s*/gi, '')
  obs = obs.replace(/^\|\s*/, '').trim()
  return {
    name:        nameMatch?.[1]?.trim()  || '',
    rut:         rutMatch?.[1]?.trim()   || '',
    phone:       telMatch?.[1]?.trim()   || '',
    email:       emailMatch?.[1]?.trim() || '',
    observation: obs,
  }
}
