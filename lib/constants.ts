export const ROLES = {
  SUPERADMIN: 'SUPERADMIN',
  AGENTE: 'AGENTE',
  PROPIETARIO: 'PROPIETARIO',
  POSTULANTE: 'POSTULANTE',
} as const

export type UserRole = (typeof ROLES)[keyof typeof ROLES]

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

export const DOCUMENT_TYPES = [
  { value: 'cedula', label: 'Cedula de Identidad' },
  { value: 'liquidacion', label: 'Liquidacion de Sueldo' },
  { value: 'contrato', label: 'Contrato de Trabajo' },
  { value: 'certificado_afp', label: 'Certificado AFP' },
  { value: 'certificado_dicom', label: 'Certificado DICOM' },
  { value: 'otro', label: 'Otro Documento' },
] as const
