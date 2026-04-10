import { redirect } from 'next/navigation'

/**
 * /propiedades → redirect to home page (which IS the property listing).
 * Preserves any search params so filters still work.
 */
export default function PropiedadesIndexPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined }
}) {
  const query = new URLSearchParams(
    Object.entries(searchParams).filter(([, v]) => v !== undefined) as [string, string][]
  ).toString()
  redirect(query ? `/?${query}` : '/')
}
