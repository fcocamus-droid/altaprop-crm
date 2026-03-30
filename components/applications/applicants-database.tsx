'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import { Search, User, Briefcase, Phone, Mail, MapPin, DollarSign, FileText, Loader2 } from 'lucide-react'

interface Applicant {
  id: string
  full_name: string | null
  email: string
  phone: string | null
  rut: string | null
  birth_date: string | null
  marital_status: string | null
  nationality: string | null
  occupation: string | null
  employer: string | null
  employment_years: number | null
  monthly_income: number | null
  housing_status: string | null
  created_at: string
  application_count: number
}

export function ApplicantsDatabase() {
  const [applicants, setApplicants] = useState<Applicant[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/postulantes')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setApplicants(data)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
  }

  const filtered = applicants.filter(a => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      (a.full_name || '').toLowerCase().includes(q) ||
      (a.email || '').toLowerCase().includes(q) ||
      (a.rut || '').toLowerCase().includes(q) ||
      (a.phone || '').toLowerCase().includes(q) ||
      (a.occupation || '').toLowerCase().includes(q) ||
      (a.employer || '').toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, RUT, email, teléfono, ocupación..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Badge variant="outline" className="shrink-0">{filtered.length} postulante{filtered.length !== 1 ? 's' : ''}</Badge>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <User className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p className="font-medium">No se encontraron postulantes</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((applicant) => {
            const isExpanded = expanded === applicant.id
            return (
              <Card key={applicant.id} className={`transition-all cursor-pointer ${isExpanded ? 'ring-2 ring-navy/20' : 'hover:shadow-md'}`}
                onClick={() => setExpanded(isExpanded ? null : applicant.id)}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm font-bold ${isExpanded ? 'bg-navy text-white' : 'bg-gold/20 text-navy'}`}>
                        {applicant.full_name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold truncate">{applicant.full_name || 'Sin nombre'}</h3>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                          {applicant.rut && <span>{applicant.rut}</span>}
                          <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{applicant.email}</span>
                          {applicant.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{applicant.phone}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {applicant.monthly_income && (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                          ${applicant.monthly_income.toLocaleString('es-CL')}/mes
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs">
                        <FileText className="h-3 w-3 mr-1" />{applicant.application_count}
                      </Badge>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 pt-3 border-t grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-sm" onClick={e => e.stopPropagation()}>
                      {applicant.occupation && (
                        <div className="flex items-start gap-2">
                          <Briefcase className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                          <div>
                            <p className="text-xs text-muted-foreground">Ocupación</p>
                            <p className="font-medium">{applicant.occupation}</p>
                          </div>
                        </div>
                      )}
                      {applicant.employer && (
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                          <div>
                            <p className="text-xs text-muted-foreground">Empresa</p>
                            <p className="font-medium">{applicant.employer}</p>
                          </div>
                        </div>
                      )}
                      {applicant.employment_years != null && (
                        <div>
                          <p className="text-xs text-muted-foreground">Antigüedad</p>
                          <p className="font-medium">{applicant.employment_years} año(s)</p>
                        </div>
                      )}
                      {applicant.monthly_income && (
                        <div className="flex items-start gap-2">
                          <DollarSign className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-xs text-muted-foreground">Renta Líquida</p>
                            <p className="font-semibold text-green-700">${applicant.monthly_income.toLocaleString('es-CL')}/mes</p>
                          </div>
                        </div>
                      )}
                      {applicant.marital_status && (
                        <div>
                          <p className="text-xs text-muted-foreground">Estado Civil</p>
                          <p className="font-medium capitalize">{applicant.marital_status}</p>
                        </div>
                      )}
                      {applicant.nationality && (
                        <div>
                          <p className="text-xs text-muted-foreground">Nacionalidad</p>
                          <p className="font-medium">{applicant.nationality}</p>
                        </div>
                      )}
                      {applicant.housing_status && (
                        <div>
                          <p className="text-xs text-muted-foreground">Vivienda</p>
                          <p className="font-medium capitalize">{applicant.housing_status}</p>
                        </div>
                      )}
                      {applicant.birth_date && (
                        <div>
                          <p className="text-xs text-muted-foreground">Fecha Nacimiento</p>
                          <p className="font-medium">{formatDate(applicant.birth_date)}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-muted-foreground">Registrado</p>
                        <p className="font-medium">{formatDate(applicant.created_at)}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
