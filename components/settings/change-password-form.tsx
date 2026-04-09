'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Lock, CheckCircle, Eye, EyeOff } from 'lucide-react'

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const supabaseRef = useRef(createClient())

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaved(false)

    if (newPassword.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    setSaving(true)
    const { error } = await supabaseRef.current.auth.updateUser({ password: newPassword })

    setSaving(false)
    if (error) {
      setError(
        error.message === 'New password should be different from the old password.'
          ? 'La nueva contraseña debe ser diferente a la actual'
          : error.message
      )
    } else {
      setSaved(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => setSaved(false), 3000)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-5 w-5" /> Cambiar Contraseña
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">{error}</div>}
          {saved && <div className="bg-green-50 text-green-700 text-sm p-3 rounded-md flex items-center gap-2"><CheckCircle className="h-4 w-4" />Contraseña actualizada correctamente</div>}

          <div className="space-y-2">
            <Label htmlFor="new_password">Nueva Contraseña</Label>
            <div className="relative">
              <Input
                id="new_password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Mínimo 6 caracteres"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm_password">Confirmar Nueva Contraseña</Label>
            <Input
              id="confirm_password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Repite tu nueva contraseña"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" disabled={saving}>
            {saved ? <CheckCircle className="mr-2 h-4 w-4 text-green-500" /> : <Lock className="mr-2 h-4 w-4" />}
            {saving ? 'Cambiando...' : saved ? 'Contraseña cambiada' : 'Cambiar Contraseña'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
