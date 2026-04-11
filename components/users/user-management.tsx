'use client'

import { useState, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { createUser, updateUserRole, updateUser, deleteUser } from '@/lib/actions/users'
import { PasswordInput } from '@/components/ui/password-input'
import { formatPhone } from '@/lib/validations/chilean-formats'
import { ROLE_CONFIG, getAllowedRolesForAdmin, canModifyUser } from '@/lib/constants'
import { getMaxAgents, getPlanName } from '@/lib/plan-features'
import { Camera, Loader2, Pencil, Check, X } from 'lucide-react'

function getRoleColor(role: string) {
  return ROLE_CONFIG.find(r => r.value === role)?.color || 'bg-gray-100 text-gray-800'
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
  email: string
  role: string
  plan: string | null
  subscriber_id: string | null
  created_at: string
  avatar_url: string | null
}

export function UserManagement({ users: initialUsers, currentUserId, currentUserRole }: { users: User[]; currentUserId: string; currentUserRole: string }) {
  const [users, setUsers] = useState(initialUsers)
  const [showAddForm, setShowAddForm] = useState(false)
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [avatarLoading, setAvatarLoading] = useState<string | null>(null)
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ full_name: '', phone: '' })
  const [editLoading, setEditLoading] = useState(false)

  const assignableRoles = getAllowedRolesForAdmin(currentUserRole)

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

  const startEdit = (user: User) => {
    setEditingId(user.id)
    setEditForm({ full_name: user.full_name || '', phone: user.phone || '' })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm({ full_name: '', phone: '' })
  }

  const handleSaveEdit = async (userId: string) => {
    setEditLoading(true)
    setError(null)
    const result = await updateUser(userId, editForm)
    if (result.error) {
      setError(result.error)
    } else {
      setUsers(prev => prev.map(u =>
        u.id === userId ? { ...u, full_name: editForm.full_name, phone: editForm.phone } : u
      ))
      setSuccess('Usuario actualizado')
      setTimeout(() => setSuccess(null), 3000)
      setEditingId(null)
    }
    setEditLoading(false)
  }

  const handleAvatarUpload = async (userId: string, file: File) => {
    setAvatarLoading(userId)
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await fetch(`/api/upload/avatar/${userId}`, { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Error al subir la foto')
      } else {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, avatar_url: data.url } : u))
        setSuccess('Foto actualizada correctamente')
        setTimeout(() => setSuccess(null), 3000)
      }
    } catch {
      setError('Error de conexión al subir la foto')
    }
    setAvatarLoading(null)
  }

  return (
    <div className="space-y-4">
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

      <div className="flex justify-end">
        <Button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-navy hover:bg-navy/90"
        >
          {showAddForm ? '✕ Cancelar' : '+ Agregar Usuario'}
        </Button>
      </div>

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
                    onChange={(e) => setNewUser({ ...newUser, phone: formatPhone(e.target.value) })}
                    placeholder="+56 9 1234 5678"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <PasswordInput
                    id="password"
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
                  {assignableRoles.map((role) => (
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

      <div className="space-y-3">
        {(() => {
          // Group users by subscriber for SUPERADMINBOSS view
          if (currentUserRole === 'SUPERADMINBOSS') {
            const groups = new Map<string, typeof users>()
            const noGroup: typeof users = []
            users.forEach(user => {
              if (user.role === 'SUPERADMINBOSS') {
                noGroup.push(user)
              } else if (user.role === 'SUPERADMIN') {
                const key = user.subscriber_id || user.id
                if (!groups.has(key)) groups.set(key, [])
                groups.get(key)!.unshift(user)
              } else if (user.subscriber_id) {
                if (!groups.has(user.subscriber_id)) groups.set(user.subscriber_id, [])
                groups.get(user.subscriber_id)!.push(user)
              } else {
                noGroup.push(user)
              }
            })

            return (
              <>
                {noGroup.map(user => renderUser(user))}
                {Array.from(groups.entries()).map(([subId, members]) => {
                  const admin = members.find(m => m.role === 'SUPERADMIN')
                  const agentCount = members.filter(m => m.role === 'AGENTE').length
                  const maxAgents = getMaxAgents(admin?.plan || null)
                  const planName = getPlanName(admin?.plan || null)
                  return (
                    <div key={subId} className="border-2 border-navy/10 rounded-lg overflow-hidden">
                      <div className="bg-navy/5 px-4 py-2 text-xs font-medium text-navy flex items-center gap-2 flex-wrap">
                        <span className="w-5 h-5 bg-navy/20 rounded-full flex items-center justify-center text-[10px] font-bold">{admin?.full_name?.[0] || '?'}</span>
                        {admin?.full_name || 'Suscriptor'} — {admin?.email || ''}
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-amber-50 text-amber-700 border-amber-200">{planName}</Badge>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${agentCount >= maxAgents ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                          Agentes: {agentCount}/{maxAgents}
                        </span>
                        <span className="ml-auto text-muted-foreground">{members.length} usuario{members.length !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="space-y-0 divide-y">
                        {members.map(user => renderUser(user))}
                      </div>
                    </div>
                  )
                })}
              </>
            )
          }
          return users.map(user => renderUser(user))
        })()}
      </div>
    </div>
  )

  function renderUser(user: User) {
    const isCurrentUser = user.id === currentUserId
    const isLoading = loading === user.id
    const isProtected = !canModifyUser(currentUserRole, user.role)

    const isEditing = editingId === user.id

    return (
      <Card key={user.id} className={`transition-all ${isLoading ? 'opacity-60' : ''} border-0 shadow-none`}>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              {/* Avatar with upload on click */}
              <div className="relative flex-shrink-0 group">
                <button
                  type="button"
                  onClick={() => fileInputRefs.current[user.id]?.click()}
                  className="w-11 h-11 rounded-full overflow-hidden focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-1"
                  title="Cambiar foto"
                >
                  {avatarLoading === user.id ? (
                    <div className="w-full h-full bg-gold/20 flex items-center justify-center">
                      <Loader2 className="h-4 w-4 animate-spin text-navy" />
                    </div>
                  ) : user.avatar_url ? (
                    <img src={user.avatar_url} alt={user.full_name || ''} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gold/20 flex items-center justify-center">
                      <span className="font-semibold text-navy text-sm">
                        {user.full_name?.[0]?.toUpperCase() || '?'}
                      </span>
                    </div>
                  )}
                  {/* Camera overlay on hover */}
                  <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera className="h-4 w-4 text-white" />
                  </div>
                </button>
                <input
                  ref={el => { fileInputRefs.current[user.id] = el }}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0]
                    if (file) handleAvatarUpload(user.id, file)
                    e.target.value = ''
                  }}
                />
              </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">
                        {user.full_name || 'Sin nombre'}
                        {isCurrentUser && <span className="text-xs text-gold ml-2">(Tú)</span>}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      <p className="text-xs text-muted-foreground">{user.phone || 'Sin teléfono'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <select
                      value={user.role}
                      onChange={(e) => handleChangeRole(user.id, e.target.value)}
                      disabled={isCurrentUser || isLoading || isProtected}
                      className={`text-xs font-medium px-3 py-1.5 rounded-full border cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${getRoleColor(user.role)}`}
                    >
                      {assignableRoles.map((role) => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </select>

                    <span className="text-xs text-muted-foreground hidden sm:inline whitespace-nowrap">
                      {formatDate(user.created_at)}
                    </span>

                    {/* Edit button */}
                    {!isProtected && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => isEditing ? cancelEdit() : startEdit(user)}
                        disabled={isLoading}
                        className="h-8 px-2 text-muted-foreground hover:text-foreground"
                        title="Editar usuario"
                      >
                        {isEditing ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                      </Button>
                    )}

                    {!isCurrentUser && !isProtected && (
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

                {/* Inline edit panel */}
                {isEditing && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Editar usuario</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor={`edit-name-${user.id}`} className="text-xs">Nombre completo</Label>
                        <Input
                          id={`edit-name-${user.id}`}
                          value={editForm.full_name}
                          onChange={e => setEditForm(f => ({ ...f, full_name: e.target.value }))}
                          placeholder="Nombre completo"
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`edit-phone-${user.id}`} className="text-xs">Teléfono</Label>
                        <Input
                          id={`edit-phone-${user.id}`}
                          value={editForm.phone}
                          onChange={e => setEditForm(f => ({ ...f, phone: formatPhone(e.target.value) }))}
                          placeholder="+56 9 1234 5678"
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-3">
                      <Button variant="outline" size="sm" onClick={cancelEdit} className="h-8 text-xs">
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleSaveEdit(user.id)}
                        disabled={editLoading}
                        className="h-8 text-xs bg-navy hover:bg-navy/90 gap-1.5"
                      >
                        {editLoading
                          ? <><Loader2 className="h-3 w-3 animate-spin" /> Guardando…</>
                          : <><Check className="h-3 w-3" /> Guardar cambios</>
                        }
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        }

        {users.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No hay usuarios registrados
          </div>
        )}
}
