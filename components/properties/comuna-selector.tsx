'use client'

import { useState, useRef, useEffect } from 'react'
import { CheckCircle2, AlertCircle, ChevronDown, X } from 'lucide-react'
import { ML_COMMUNES, isMLCommune } from '@/lib/ml/communes'

interface ComunaSelectorProps {
  name: string
  defaultValue?: string | null
  placeholder?: string
}

export function ComunaSelector({
  name,
  defaultValue = '',
  placeholder = 'Buscar comuna...',
}: ComunaSelectorProps) {
  const [query, setQuery] = useState(defaultValue || '')
  const [open, setOpen] = useState(false)
  const [touched, setTouched] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const recognized = isMLCommune(query)

  // Filter communes by query
  const filtered = query.trim().length === 0
    ? ML_COMMUNES
    : ML_COMMUNES.filter(c =>
        c.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          .includes(
            query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          )
      )

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function selectCommune(name: string) {
    setQuery(name)
    setOpen(false)
    setTouched(true)
  }

  function clearValue() {
    setQuery('')
    setTouched(true)
    inputRef.current?.focus()
  }

  const showStatus = touched || !!defaultValue

  return (
    <div ref={containerRef} className="relative">
      {/* Hidden input that submits with the form */}
      <input type="hidden" name={name} value={query} />

      {/* Visible combobox input */}
      <div className={`flex items-center rounded-md border bg-background transition-colors focus-within:ring-2 focus-within:ring-ring ${
        showStatus && query
          ? recognized
            ? 'border-green-400 focus-within:ring-green-300'
            : 'border-orange-400 focus-within:ring-orange-300'
          : 'border-input'
      }`}>
        <input
          ref={inputRef}
          type="text"
          value={query}
          placeholder={placeholder}
          autoComplete="off"
          className="flex-1 h-10 px-3 text-sm bg-transparent outline-none"
          onChange={e => {
            setQuery(e.target.value)
            setOpen(true)
            setTouched(true)
          }}
          onFocus={() => setOpen(true)}
        />

        {/* Status icon */}
        {showStatus && query && (
          <span className="px-1 flex-shrink-0">
            {recognized
              ? <CheckCircle2 className="h-4 w-4 text-green-500" />
              : <AlertCircle className="h-4 w-4 text-orange-400" />
            }
          </span>
        )}

        {/* Clear button */}
        {query && (
          <button
            type="button"
            onClick={clearValue}
            className="px-1 text-muted-foreground hover:text-foreground flex-shrink-0"
            tabIndex={-1}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}

        {/* Dropdown chevron */}
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="px-2 text-muted-foreground hover:text-foreground flex-shrink-0"
          tabIndex={-1}
        >
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Status message */}
      {showStatus && query && (
        <p className={`text-[11px] mt-1 ${recognized ? 'text-green-600' : 'text-orange-500'}`}>
          {recognized
            ? '✓ Comuna reconocida por MercadoLibre'
            : '⚠ Esta comuna no está en el listado de ML — selecciona una de la lista para publicar en portales'
          }
        </p>
      )}

      {/* Dropdown list */}
      {open && (
        <div className="absolute z-50 top-full mt-1 w-full max-h-56 overflow-y-auto rounded-md border border-border bg-popover shadow-md">
          {filtered.length === 0 ? (
            <div className="px-3 py-4 text-sm text-muted-foreground text-center">
              Sin resultados para &ldquo;{query}&rdquo;
            </div>
          ) : (
            filtered.map(c => (
              <button
                key={c.key}
                type="button"
                className={`w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground flex items-center justify-between group ${
                  query.toLowerCase() === c.name.toLowerCase() ? 'bg-accent/50 font-medium' : ''
                }`}
                onMouseDown={e => {
                  e.preventDefault()
                  selectCommune(c.name)
                }}
              >
                <span>{c.name}</span>
                <span className="text-[10px] text-muted-foreground group-hover:text-accent-foreground/60">
                  {c.region.replace('Región ', '')}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
