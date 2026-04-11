import { Home, Building2, FileText, Users, Settings, Plus, CreditCard, Crown, Calendar, UserSearch, KeyRound, Globe, LayoutGrid } from 'lucide-react'
import { ROLES, ADMIN_ROLES, PROPERTY_MANAGER_ROLES, ALL_ROLE_VALUES, type UserRole } from '@/lib/constants'

export const menuItems = [
  { href: '/dashboard', label: 'Panel Principal', icon: Home, roles: ALL_ROLE_VALUES },
  { href: '/dashboard/propiedades', label: 'Propiedades', icon: Building2, roles: PROPERTY_MANAGER_ROLES },
  { href: '/dashboard/propiedades/nueva', label: 'Nueva Propiedad', icon: Plus, roles: PROPERTY_MANAGER_ROLES },
  { href: '/dashboard/postulaciones', label: 'Postulaciones', icon: FileText, roles: ALL_ROLE_VALUES },
  { href: '/dashboard/base-postulantes', label: 'Base Postulantes', icon: UserSearch, roles: [...ADMIN_ROLES, ROLES.AGENTE] as UserRole[] },
  { href: '/dashboard/base-propietarios', label: 'Base Propietarios', icon: KeyRound, roles: [...ADMIN_ROLES, ROLES.AGENTE] as UserRole[] },
  { href: '/dashboard/visitas', label: 'Visitas', icon: Calendar, roles: PROPERTY_MANAGER_ROLES },
  { href: '/dashboard/mi-sitio', label: 'Mi Sitio Web', icon: Globe, roles: [ROLES.SUPERADMIN, ROLES.SUPERADMINBOSS] as UserRole[] },
  { href: '/dashboard/plan', label: 'Mi Plan', icon: CreditCard, roles: [ROLES.SUPERADMIN] as UserRole[] },
  { href: '/dashboard/suscriptores', label: 'Suscriptores', icon: Crown, roles: [ROLES.SUPERADMINBOSS] as UserRole[] },
  { href: '/dashboard/usuarios', label: 'Agentes', icon: Users, roles: ADMIN_ROLES },
  { href: '/dashboard/portales', label: 'Portales', icon: LayoutGrid, roles: ADMIN_ROLES },
  { href: '/dashboard/configuracion', label: 'Configuracion', icon: Settings, roles: ALL_ROLE_VALUES },
]
