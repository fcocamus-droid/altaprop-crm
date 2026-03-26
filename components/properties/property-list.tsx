'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/status-badge'
import { deleteProperty } from '@/lib/actions/properties'
import { Pencil, Trash2 } from 'lucide-react'

function formatPrice(price: number, currency: string) {
  if (currency === 'UF') return `${price} UF`
  if (currency === 'USD') return `$${price.toLocaleString('en-US')} USD`
  return `$${price.toLocaleString('es-CL')}`
}

interface Property {
  id: string
  title: string
  price: number
  currency: string
  city: string
  sector: string
  status: string
  images?: { url: string }[]
}

export function PropertyList({ properties: initialProperties }: { properties: Property[] }) {
  const [properties, setProperties] = useState(initialProperties)
  const [deleting, setDeleting] = useState<string | null>(null)
  const router = useRouter()

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`¿Eliminar "${title}"? Esta acción no se puede deshacer.`)) return

    setDeleting(id)
    const result = await deleteProperty(id)

    if (result.error) {
      alert(result.error)
      setDeleting(null)
      return
    }

    setProperties(prev => prev.filter(p => p.id !== id))
    setDeleting(null)
    router.refresh()
  }

  return (
    <div className="space-y-4">
      {properties.map((property) => (
        <Card key={property.id} className={deleting === property.id ? 'opacity-50' : ''}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted shrink-0">
                  {property.images?.[0]?.url ? (
                    <img src={property.images[0].url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">N/A</div>
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold truncate">{property.title}</h3>
                  <p className="text-sm text-muted-foreground">{property.city}{property.sector ? `, ${property.sector}` : ''}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-semibold text-sm text-navy">{formatPrice(property.price, property.currency)}</span>
                    <StatusBadge status={property.status} type="property" />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link href={`/dashboard/propiedades/${property.id}`}>
                    <Pencil className="mr-2 h-3 w-3" />Editar
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(property.id, property.title)}
                  disabled={deleting === property.id}
                  className="text-red-500 border-red-200 hover:bg-red-50 hover:text-red-700"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
