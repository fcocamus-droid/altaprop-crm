'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { Label } from '@/components/ui/label'
import { LogIn, Loader2 } from 'lucide-react'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const verified = searchParams.get('verified') === 'true'
  const redirectTo = searchParams.get('redirect')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message === 'Invalid login credentials'
        ? 'Email o contrasena incorrectos'
        : error.message === 'Email not confirmed'
          ? 'Debes verificar tu email antes de iniciar sesion. Revisa tu bandeja de entrada.'
          : error.message)
      setLoading(false)
      return
    }

    router.push(redirectTo || '/dashboard')
    router.refresh()
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Iniciar Sesion</CardTitle>
        <CardDescription>Ingresa tus credenciales para acceder</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {verified && (
            <div className="bg-green-50 border border-green-200 text-green-700 text-sm p-3 rounded-md">
              Email verificado exitosamente. Ya puedes iniciar sesion.
            </div>
          )}
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
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Contrasena</Label>
              <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                Olvidaste tu contrasena?
              </Link>
            </div>
            <PasswordInput
              id="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
            Iniciar Sesion
          </Button>
          <p className="text-sm text-muted-foreground text-center">
            No tienes cuenta?{' '}
            {redirectTo?.startsWith('/propiedades/') ? (
              <Link href={`/registro-postulante?property=${redirectTo.split('/').pop()}`} className="text-primary hover:underline font-medium">
                Regístrate como postulante
              </Link>
            ) : (
              <Link href="/register" className="text-primary hover:underline font-medium">
                Registrate aqui
              </Link>
            )}
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Iniciar Sesion</CardTitle>
          <CardDescription>Cargando...</CardDescription>
        </CardHeader>
      </Card>
    }>
      <LoginForm />
    </Suspense>
  )
}
