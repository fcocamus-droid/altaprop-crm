// Pipeline de ventas para prospectos inmobiliarios
export const PROSPECTO_STATUSES = [
  { value: 'nuevo',        label: 'Nuevo',         color: 'bg-slate-100 text-slate-800 border-slate-300',       dot: 'bg-slate-400',   order: 0 },
  { value: 'contactado',   label: 'Contactado',    color: 'bg-blue-100 text-blue-800 border-blue-300',          dot: 'bg-blue-500',    order: 1 },
  { value: 'calificado',   label: 'Calificado',    color: 'bg-cyan-100 text-cyan-800 border-cyan-300',          dot: 'bg-cyan-500',    order: 2 },
  { value: 'propuesta',    label: 'Propuesta',     color: 'bg-indigo-100 text-indigo-800 border-indigo-300',    dot: 'bg-indigo-500',  order: 3 },
  { value: 'negociacion',  label: 'Negociación',   color: 'bg-amber-100 text-amber-800 border-amber-300',       dot: 'bg-amber-500',   order: 4 },
  { value: 'seguimiento',  label: 'Seguimiento',   color: 'bg-purple-100 text-purple-800 border-purple-300',    dot: 'bg-purple-500',  order: 5 },
  { value: 'ganado',       label: 'Ganado',        color: 'bg-emerald-100 text-emerald-800 border-emerald-300', dot: 'bg-emerald-500', order: 6 },
  { value: 'perdido',      label: 'Perdido',       color: 'bg-red-100 text-red-800 border-red-300',             dot: 'bg-red-500',     order: 7 },
] as const

export const PROSPECTO_PRIORITIES = [
  { value: 'alta',  label: 'Alta',  color: 'bg-red-100 text-red-800 border-red-300',       icon: '🔥' },
  { value: 'media', label: 'Media', color: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: '⚡' },
  { value: 'baja',  label: 'Baja',  color: 'bg-gray-100 text-gray-700 border-gray-300',    icon: '💬' },
] as const

export const PROSPECTO_SOURCES = [
  { value: 'web',             label: 'Sitio Web' },
  { value: 'referido',        label: 'Referido' },
  { value: 'cold_call',       label: 'Llamada en frío' },
  { value: 'evento',          label: 'Evento' },
  { value: 'redes_sociales',  label: 'Redes sociales' },
  { value: 'portal',          label: 'Portal inmobiliario' },
  { value: 'whatsapp',        label: 'WhatsApp' },
  { value: 'otro',            label: 'Otro' },
] as const

export const PROSPECTO_INTERESTS = [
  { value: 'arriendo',   label: 'Arriendo' },
  { value: 'venta',      label: 'Venta' },
  { value: 'inversion',  label: 'Inversión' },
  { value: 'ambos',      label: 'Arriendo o venta' },
] as const

export const PROSPECTO_TIPOS = [
  { value: 'visita',       label: 'Visita',        color: 'bg-blue-100 text-blue-800 border-blue-300',       icon: '👁️' },
  { value: 'postulante',   label: 'Postulante',    color: 'bg-purple-100 text-purple-800 border-purple-300', icon: '📝' },
  { value: 'propietario',  label: 'Propietario',   color: 'bg-amber-100 text-amber-800 border-amber-300',    icon: '🏠' },
  { value: 'inmobiliaria', label: 'Inmobiliaria',  color: 'bg-emerald-100 text-emerald-800 border-emerald-300', icon: '🏢' },
  { value: 'corredor',     label: 'Corredor',      color: 'bg-indigo-100 text-indigo-800 border-indigo-300', icon: '🧑‍💼' },
] as const

export type ProspectoTipo = (typeof PROSPECTO_TIPOS)[number]['value']
export function getTipoConfig(tipo: string) {
  return PROSPECTO_TIPOS.find(t => t.value === tipo)
}

export const PROSPECTO_PROPERTY_TYPES = [
  { value: 'depto',    label: 'Departamento' },
  { value: 'casa',     label: 'Casa' },
  { value: 'oficina',  label: 'Oficina' },
  { value: 'local',    label: 'Local comercial' },
  { value: 'terreno',  label: 'Terreno' },
  { value: 'parcela',  label: 'Parcela' },
  { value: 'otro',     label: 'Otro' },
] as const

export const ACTIVITY_TYPES = [
  { value: 'nota',      label: 'Nota',      icon: '📝', color: 'bg-gray-100 text-gray-700' },
  { value: 'llamada',   label: 'Llamada',   icon: '📞', color: 'bg-blue-100 text-blue-700' },
  { value: 'email',     label: 'Email',     icon: '✉️',  color: 'bg-indigo-100 text-indigo-700' },
  { value: 'whatsapp',  label: 'WhatsApp',  icon: '💬', color: 'bg-green-100 text-green-700' },
  { value: 'reunion',   label: 'Reunión',   icon: '🤝', color: 'bg-purple-100 text-purple-700' },
  { value: 'visita',    label: 'Visita',    icon: '🏠', color: 'bg-amber-100 text-amber-700' },
  { value: 'tarea',     label: 'Tarea',     icon: '☑️',  color: 'bg-cyan-100 text-cyan-700' },
] as const

export type ProspectoStatus   = (typeof PROSPECTO_STATUSES)[number]['value']
export type ProspectoPriority = (typeof PROSPECTO_PRIORITIES)[number]['value']
export type ActivityType      = (typeof ACTIVITY_TYPES)[number]['value']

export function getStatusConfig(status: string) {
  return PROSPECTO_STATUSES.find(s => s.value === status) || PROSPECTO_STATUSES[0]
}
export function getPriorityConfig(priority: string) {
  return PROSPECTO_PRIORITIES.find(p => p.value === priority) || PROSPECTO_PRIORITIES[1]
}
export function getActivityTypeConfig(type: string) {
  return ACTIVITY_TYPES.find(a => a.value === type) || ACTIVITY_TYPES[0]
}
