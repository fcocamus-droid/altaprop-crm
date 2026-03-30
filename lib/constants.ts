export const ROLES = {
  SUPERADMINBOSS: 'SUPERADMINBOSS',
  SUPERADMIN: 'SUPERADMIN',
  AGENTE: 'AGENTE',
  PROPIETARIO: 'PROPIETARIO',
  POSTULANTE: 'POSTULANTE',
} as const

export type UserRole = (typeof ROLES)[keyof typeof ROLES]

export const ADMIN_ROLES: UserRole[] = [ROLES.SUPERADMINBOSS, ROLES.SUPERADMIN]
export const PROPERTY_MANAGER_ROLES: UserRole[] = [ROLES.SUPERADMINBOSS, ROLES.SUPERADMIN, ROLES.AGENTE, ROLES.PROPIETARIO]
export const ALL_ROLE_VALUES: UserRole[] = Object.values(ROLES)

export function isAdmin(role: string): boolean {
  return ADMIN_ROLES.includes(role as UserRole)
}

export function isPropertyManager(role: string): boolean {
  return PROPERTY_MANAGER_ROLES.includes(role as UserRole)
}

export const ROLE_CONFIG = [
  { value: ROLES.SUPERADMINBOSS, label: 'Super Admin Boss', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  { value: ROLES.SUPERADMIN, label: 'Super Admin', color: 'bg-red-100 text-red-800 border-red-200' },
  { value: ROLES.AGENTE, label: 'Agente', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { value: ROLES.PROPIETARIO, label: 'Propietario', color: 'bg-green-100 text-green-800 border-green-200' },
  { value: ROLES.POSTULANTE, label: 'Postulante', color: 'bg-gray-100 text-gray-800 border-gray-200' },
] as const

export const ROLE_LABELS: Record<string, string> = Object.fromEntries(
  ROLE_CONFIG.map(r => [r.value, r.label])
)

export function getAllowedRolesForAdmin(adminRole: string) {
  if (adminRole === ROLES.SUPERADMINBOSS) return ROLE_CONFIG
  if (adminRole === ROLES.SUPERADMIN) return ROLE_CONFIG.filter(r => !ADMIN_ROLES.includes(r.value as UserRole))
  return []
}

export function canModifyUser(actorRole: string, targetRole: string): boolean {
  if (actorRole === ROLES.SUPERADMINBOSS) return true
  if (actorRole === ROLES.SUPERADMIN) return !ADMIN_ROLES.includes(targetRole as UserRole)
  return false
}

export const PROPERTY_TYPES = [
  { value: 'departamento', label: 'Departamento' },
  { value: 'casa', label: 'Casa' },
  { value: 'villa', label: 'Villa' },
  { value: 'terreno', label: 'Terreno' },
  { value: 'oficina', label: 'Oficina' },
  { value: 'local', label: 'Local Comercial' },
] as const

export const OPERATION_TYPES = [
  { value: 'arriendo', label: 'Arriendo' },
  { value: 'venta', label: 'Venta' },
] as const

export const CURRENCIES = [
  { value: 'CLP', label: 'CLP ($)' },
  { value: 'UF', label: 'UF' },
  { value: 'USD', label: 'USD (US$)' },
] as const

export const PROPERTY_STATUSES = [
  { value: 'available', label: 'Disponible', color: 'bg-green-100 text-green-800' },
  { value: 'reserved', label: 'Reservada', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'rented', label: 'Arrendada', color: 'bg-blue-100 text-blue-800' },
  { value: 'sold', label: 'Vendida', color: 'bg-purple-100 text-purple-800' },
] as const

export const APPLICATION_STATUSES = [
  { value: 'pending', label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'reviewing', label: 'En Revision', color: 'bg-blue-100 text-blue-800' },
  { value: 'approved', label: 'Aprobada', color: 'bg-green-100 text-green-800' },
  { value: 'rejected', label: 'Rechazada', color: 'bg-red-100 text-red-800' },
] as const

export const VISIT_STATUSES = [
  { value: 'pending', label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'confirmed', label: 'Confirmada', color: 'bg-blue-100 text-blue-800' },
  { value: 'completed', label: 'Completada', color: 'bg-green-100 text-green-800' },
  { value: 'canceled', label: 'Cancelada', color: 'bg-red-100 text-red-800' },
] as const

export const PLANS = [
  { id: 'started', name: 'Started', price: 19, agents: 1, trial: false, features: ['1 agente incluido', 'Hasta 5 propiedades', 'Postulaciones y visitas', 'Soporte por email'] },
  { id: 'basico', name: 'Básico', price: 29, agents: 3, trial: true, trialDays: 7, features: ['3 agentes incluidos', 'Propiedades ilimitadas', 'Importar desde tu sitio web', 'Postulaciones y visitas', 'Soporte prioritario'] },
  { id: 'pro', name: 'Pro', price: 49, agents: 5, trial: true, trialDays: 7, recommended: true, features: ['5 agentes incluidos', 'Todo lo del Básico', 'Reportes avanzados', 'Personalización de marca', 'Soporte 24/7'] },
  { id: 'enterprise', name: 'Enterprise', price: 99, agents: 10, trial: true, trialDays: 7, features: ['10 agentes incluidos', 'Todo lo del Pro', 'API dedicada', 'Onboarding personalizado', 'Gerente de cuenta'] },
] as const

export type PlanId = (typeof PLANS)[number]['id']

export const SUBSCRIPTION_STATUSES = ['none', 'trialing', 'active', 'past_due', 'canceled'] as const

export const DOCUMENT_TYPES = [
  { value: 'cedula', label: 'Cédula de Identidad (ambos lados)' },
  { value: 'liquidacion_1', label: '1era Última Liquidación de Sueldo' },
  { value: 'liquidacion_2', label: '2da Última Liquidación de Sueldo' },
  { value: 'liquidacion_3', label: '3era Última Liquidación de Sueldo' },
  { value: 'certificado_afp', label: 'Certificado Cotizaciones AFP (12 meses)' },
  { value: 'contrato', label: 'Contrato de Trabajo / Cert. Antigüedad' },
  { value: 'informe_comercial', label: 'Informe Comercial (Dicom / Equifax)' },
  { value: 'otro', label: 'Otro Documento' },
] as const

export const REQUIRED_DOC_SLOTS = [
  { type: 'cedula', label: 'Cédula de Identidad (ambos lados)' },
  { type: 'liquidacion_1', label: '1era Última Liquidación de Sueldo' },
  { type: 'liquidacion_2', label: '2da Última Liquidación de Sueldo' },
  { type: 'liquidacion_3', label: '3era Última Liquidación de Sueldo' },
  { type: 'certificado_afp', label: 'Certificado Cotizaciones AFP (12 meses)' },
  { type: 'contrato', label: 'Contrato de Trabajo / Cert. Antigüedad' },
  { type: 'informe_comercial', label: 'Informe Comercial (Dicom / Equifax)' },
] as const
