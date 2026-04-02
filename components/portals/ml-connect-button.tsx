'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-react'

interface MLConnectButtonProps {
  profile: {
    ml_user_id?: string | null
    ml_connected_at?: string | null
    ml_access_token?: string | null
  }
}

export function MLConnectButton({ profile }: MLConnectButtonProps) {
  const [disconnecting, setDisconnecting] = useState(false)
  const isConnected = Boolean(profile?.ml_access_token && profile?.ml_user_id)

  async function handleDisconnect() {
    setDisconnecting(true)
    try {
      await fetch('/api/ml/disconnect', { method: 'POST' })
      window.location.reload()
    } catch {
      setDisconnecting(false)
    }
  }

  if (isConnected) {
    return (
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {/* ML logo */}
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border bg-[#FFE600] p-1.5 flex-shrink-0">
            <MLLogo />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">MercadoLibre / Portal Inmobiliario</span>
              <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">
                Conectado
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Usuario ML: {profile.ml_user_id}
              {profile.ml_connected_at && (
                <> &middot; conectado el {new Date(profile.ml_connected_at).toLocaleDateString('es-CL')}</>
              )}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDisconnect}
          disabled={disconnecting}
          className="text-destructive border-destructive/40 hover:bg-destructive/10"
        >
          {disconnecting ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : null}
          Desconectar
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg border bg-[#FFE600] p-1.5 flex-shrink-0">
          <MLLogo />
        </div>
        <div>
          <p className="text-sm font-medium">MercadoLibre / Portal Inmobiliario</p>
          <p className="text-xs text-muted-foreground">
            Publica tus propiedades en MercadoLibre y Portal Inmobiliario con un solo clic
          </p>
        </div>
      </div>
      <Button
        onClick={() => { window.location.href = '/api/ml/auth' }}
        className="bg-[#FFE600] text-[#1a1a1a] hover:bg-[#FFE600]/90 font-semibold"
        size="sm"
      >
        Conectar cuenta
      </Button>
    </div>
  )
}

// Inline MercadoLibre logo SVG
function MLLogo() {
  return (
    <svg viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-6 w-auto">
      <path
        d="M24 0C10.745 0 0 7.163 0 16s10.745 16 24 16 24-7.163 24-16S37.255 0 24 0z"
        fill="#FFE600"
      />
      <path
        d="M24 4C13.507 4 5 9.373 5 16s8.507 12 19 12 19-5.373 19-12S34.493 4 24 4z"
        fill="#FFE600"
      />
      <path
        d="M16 12l4 8 4-8 4 8 4-8"
        stroke="#1a1a1a"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  )
}
