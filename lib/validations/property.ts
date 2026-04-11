import { z } from 'zod'

export const propertySchema = z.object({
  // ── Core ─────────────────────────────────────────────────────────────────
  title: z.string().min(3, 'El título debe tener al menos 3 caracteres'),
  description: z.string().optional(),
  private_name: z.string().optional(),
  internal_code: z.string().optional(),

  // ── Classification ───────────────────────────────────────────────────────
  type: z.enum([
    'departamento', 'casa', 'casa_condominio', 'villa', 'quinta',
    'monoambiente', 'terreno', 'terreno_comercial', 'oficina', 'local',
    'bodega', 'edificio', 'hotel', 'nave_industrial',
  ], { required_error: 'Selecciona un tipo de propiedad' }),

  operation: z.enum(['arriendo', 'arriendo_temporal', 'venta'], {
    required_error: 'Selecciona tipo de operación',
  }),

  // ── Pricing ──────────────────────────────────────────────────────────────
  price: z.coerce.number().positive('El precio debe ser mayor a 0'),
  currency: z.enum(['CLP', 'UF', 'USD']).default('CLP'),
  common_expenses: z.coerce.number().int().min(0).optional(),
  contribuciones: z.coerce.number().int().min(0).optional(),

  // ── Location ─────────────────────────────────────────────────────────────
  address: z.string().optional(),
  address2: z.string().optional(),
  city: z.string().optional(),
  sector: z.string().optional(),
  region: z.string().optional(),
  zip_code: z.string().optional(),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  show_exact_location: z.coerce.boolean().optional(),

  // ── Unit details ─────────────────────────────────────────────────────────
  bedrooms: z.coerce.number().int().min(0).optional(),
  bathrooms: z.coerce.number().int().min(0).optional(),
  half_bathrooms: z.coerce.number().int().min(0).optional(),
  parking: z.coerce.number().int().min(0).optional(),
  storage: z.coerce.number().int().min(0).optional(),
  floor_level: z.coerce.number().int().optional(),
  floor_count: z.coerce.number().int().optional(),
  keys_count: z.coerce.number().int().min(0).optional(),

  // ── Surfaces ─────────────────────────────────────────────────────────────
  sqm: z.coerce.number().positive().optional(),
  covered_sqm: z.coerce.number().positive().optional(),
  terrace_sqm: z.coerce.number().positive().optional(),

  // ── Property attributes ──────────────────────────────────────────────────
  condition: z.string().optional(),
  year_built: z.coerce.number().int().min(1800).max(2100).optional(),
  style: z.string().optional(),
  furnished: z.coerce.boolean().optional(),
  pets_allowed: z.coerce.boolean().optional(),
  exclusive: z.coerce.boolean().optional(),
  has_sign: z.coerce.boolean().optional(),

  // ── Multimedia ───────────────────────────────────────────────────────────
  video_url: z.string().url().optional().or(z.literal('')),
  virtual_tour_url: z.string().url().optional().or(z.literal('')),

  // ── Internal management ──────────────────────────────────────────────────
  private_notes: z.string().optional(),
  notify_email: z.string().email().optional().or(z.literal('')),

  // ── Status ───────────────────────────────────────────────────────────────
  status: z.enum(['available', 'unavailable', 'reserved', 'rented', 'sold']).default('available'),
})

export type PropertyFormData = z.infer<typeof propertySchema>
