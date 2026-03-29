'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Mail, Loader2, CheckCircle, ArrowLeft, ExternalLink } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [directLink, setDirectLink] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()

      if (data.error) {
        setError(data.error)
      } else if (data.directLink) {
        setDirectLink(data.directLink)
        setSuccess(true)
      } else {
        setSuccess(true)
      }
    } catch {
      setError('Error de conexion. Intenta de nuevo.')
    }
    setLoading(false)
  }

  if (success) {
    return (
      <Card>
        <CardContent className="pt-6 text-center space-y-4">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
          <h2 className="text-xl font-semibold">
            {directLink ? 'Enlace de recuperacion generado' : 'Email enviado'}
          </h2>
          {directLink ? (
            <>
              <p className="text-muted-foreground text-sm">
                Haz clic en el boton para restablecer tu contrasena:
              </p>
              <Button asChild className="w-full bg-navy hover:bg-navy/90">
                <a href={directLink}><ExternalLink className="mr-2 h-4 w-4" />Restablecer Contrasena</a>
              </Button>
            </>
          ) : (
            <p className="text-muted-foreground">
              Revisa tu bandeja de entrada en <strong>{email}</strong>. Haz clic en el enlace para restablecer tu contrasena.
            </p>
          )}
          <Button asChild variant="outline" className="w-full">
            <Link href="/login"><ArrowLeft className="mr-2 h-4 w-4" />Volver al Login</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Recuperar Contrasena</CardTitle>
        <CardDescription>Ingresa tu email y te enviaremos un enlace para restablecer tu contrasena</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
            Enviar Enlace de Recuperacion
          </Button>
          <Link href="/login" className="text-sm text-muted-foreground hover:underline">
            <ArrowLeft className="inline mr-1 h-3 w-3" />Volver al Login
          </Link>
        </CardFooter>
      </form>
    </Card>
  )
}
