'use client'

// Last-resort fallback for errors that escape the (dashboard)/error.tsx and
// (public)/error.tsx boundaries (e.g. crashes in the root layout itself).
// Required to render its own <html> + <body>.

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[global] error boundary caught:', error)
  }, [error])

  return (
    <html lang="es">
      <body style={{ margin: 0, fontFamily: 'system-ui, -apple-system, sans-serif', background: '#f8fafc' }}>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ maxWidth: 420, background: 'white', border: '1px solid #e2e8f0', borderRadius: 16, padding: 28, textAlign: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: 38 }}>⚠️</div>
            <h1 style={{ fontSize: 18, fontWeight: 600, margin: '12px 0 4px' }}>Algo salió mal</h1>
            <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
              Encontramos un problema cargando la página. Vuelve a intentarlo o recarga el navegador.
            </p>
            {error?.digest && (
              <p style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace', marginTop: 12 }}>
                ID: {error.digest}
              </p>
            )}
            <div style={{ marginTop: 20, display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button
                onClick={reset}
                style={{ background: '#1B2A4A', color: 'white', border: 0, padding: '10px 18px', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}
              >
                Reintentar
              </button>
              <a
                href="/"
                style={{ background: 'white', color: '#1B2A4A', border: '1px solid #cbd5e1', padding: '10px 18px', borderRadius: 8, fontSize: 14, fontWeight: 500, textDecoration: 'none' }}
              >
                Ir al inicio
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
