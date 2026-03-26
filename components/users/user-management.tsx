'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { createUser, updateUserRole, deleteUser } from '@/lib/actions/users'

const ROLES = [
  { value: 'SUPERADMIN', label: 'Super Admin', color: 'bg-red-100 text-red-800 border-red-200' },
  { value: 'AGENTE', label: 'Agente', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { value: 'PROPIETARIO', label: 'Propietario', color: 'bg-green-100 text-green-800 border-green-200' },
  { value: 'POSTULANTE', label: 'Postulante', color: 'bg-gray-100 text-gray-800 border-gray-200' },
]

function getRoleColor(role: string) {
  return ROLES.find(r => r.value === role)?.color || 'bg-gray-100 text-gray-800'
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

interface User {
  id: string
  full_name: string | null
  phone: string | null
  role: string
  created_at: string
}

export function UserManagement({ users: initialUsers, currentUserId }: { users: User[]; currentUserId: string }) {
  const [users, setUsers] = useState(initialUsers)
  const [showAddForm, setShowAddForm] = useState(false)
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Add user form state
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    full_name: '',
    phone: '',
    role: 'POSTULANTE',
  })

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading('create')
    setError(null)
    setSuccess(null)

    const result = await createUser(newUser)

    if (result.error) {
      setError(result.error)
    } else {
      setSuccess('Usuario creado exitosamente')
      setShowAddForm(false)
      setNewUser({ email: '', password: '', full_name: '', phone: '', role: 'POSTULANTE' })
      // Reload page to get updated list
      window.location.reload()
    }
    setLoading(null)
  }

  const handleChangeRole = async (userId: string, newRole: string) => {
    setLoading(userId)
    setError(null)
    setSuccess(null)

    const result = await updateUserRole(userId, newRole)

    if (result.error) {
      setError(result.error)
    } else {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u))
      setSuccess('Rol actualizado')
    }
    setLoading(null)
  }

  const handleDeleteUser = async (userId: string, name: string) => {
    if (!confirm(`¿Estás seguro de eliminar a ${name}? Esta acción no se puede deshacer.`)) return

    setLoading(userId)
    setError(null)
    setSuccess(null)

    const result = await deleteUser(userId)

    if (result.error) {
      setError(result.error)
    } else {
      setUsers(prev => prev.filter(u => u.id !== userId))
      setSuccess('Usuario eliminado')
    }
    setLoading(null)
  }

  return (
    <div className="space-y-4">
      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
          {success}
        </div>
      )}

      {/* Add User Button */}
      <div className="flex justify-end">
        <Button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-navy hover:bg-navy/90"
        >
          {showAddForm ? '✕ Cancelar' : '+ Agregar Usuario'}
        </Button>
      </div>

      {/* Add User Form */}
      {showAddForm && (
        <Card className="border-2 border-gold/30">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-navy mb-4">Nuevo Usuario</h3>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Nombre Completo</Label>
                  <Input
                    id="full_name"
                    value={newUser.full_name}
                    onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                    placeholder="Juan Pérez"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    placeholder="juan@ejemplo.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input
                    id="phone"
                    value={newUser.phone}
                    onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                    placeholder="+56912345678"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <Input
                    id="password"
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    placeholder="Mínimo 6 caracteres"
                    minLength={6}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Rol del Usuario</Label>
                <div className="flex flex-wrap gap-2">
                  {ROLES.map((role) => (
                    <button
                      key={role.value}
                      type="button"
                      onClick={() => setNewUser({ ...newUser, role: role.value })}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border-2 transition-all ${
                        newUser.role === role.value
                          ? `${role.color} border-current ring-2 ring-offset-1`
                          : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {role.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-navy hover:bg-navy/90" disabled={loading === 'create'}>
                  {loading === 'create' ? 'Creando...' : 'Crear Usuario'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Users List */}
      <div className="space-y-3">
        {users.map((user) => {
          const isCurrentUser = user.id === currentUserId
          const isLoading = loading === user.id

          return (
            <Card key={user.id} className={`transition-all ${isLoading ? 'opacity-60' : ''}`}>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* User Info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center flex-shrink-0">
                      <span className="font-semibold text-navy text-sm">
                        {user.full_name?.[0]?.toUpperCase() || '?'}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">
                        {user.full_name || 'Sin nombre'}
                        {isCurrentUser && <span className="text-xs text-gold ml-2">(Tú)</span>}
                      </p>
                      <p className="text-sm text-muted-foreground">{user.phone || 'Sin teléfono'}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {/* Role Selector */}
                    <select
                      value={user.role}
                      onChange={(e) => handleChangeRole(user.id, e.target.value)}
                      disabled={isCurrentUser || isLoading}
                      className={`text-xs font-medium px-3 py-1.5 rounded-full border cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${getRoleColor(user.role)}`}
                    >
                      {ROLES.map((role) => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </select>

                    {/* Date */}
                    <span className="text-xs text-muted-foreground hidden sm:inline whitespace-nowrap">
                      {formatDate(user.created_at)}
                    </span>

                    {/* Delete Button */}
                    {!isCurrentUser && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteUser(user.id, user.full_name || 'este usuario')}
                        disabled={isLoading}
                        className="text-red-500 border-red-200 hover:bg-red-50 hover:text-red-700 h-8 px-2"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" x2="10" y1="11" y2="17" /><line x1="14" x2="14" y1="11" y2="17" />
                        </svg>
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}

        {users.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No hay usuarios registrados
          </div>
        )}
      </div>
    </div>
  )
}
