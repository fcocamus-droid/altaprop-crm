'use client'

// Catches any unhandled exception from a server or client component inside
// the dashboard and shows a graceful retry surface instead of the default
// Next.js error page.

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Surface the error in production logs without crashing the app
    console.error('[dashboard] error boundary caught:', error)
  }, [error])

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white border rounded-2xl shadow-sm p-6 text-center space-y-4">
        <div className="w-12 h-12 mx-auto bg-red-50 text-red-600 rounded-full flex items-center justify-center">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Ocurrió un error</h2>
          <p className="text-sm text-muted-foreground mt-1">
            No pudimos cargar esta sección. Puedes intentar de nuevo o volver al panel principal.
          </p>
        </div>
        {error?.digest && (
          <p className="text-[10px] text-muted-foreground font-mono">
            ID: {error.digest}
          </p>
        )}
        <div className="flex gap-2 justify-center">
          <Button onClick={reset} variant="default" className="gap-1.5">
            <RefreshCw className="h-4 w-4" /> Reintentar
          </Button>
          <Button asChild variant="outline" className="gap-1.5">
            <Link href="/dashboard">
              <Home className="h-4 w-4" /> Ir al panel
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
