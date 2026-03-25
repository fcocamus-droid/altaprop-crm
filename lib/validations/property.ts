import { z } from 'zod'

export const propertySchema = z.object({
  title: z.string().min(3, 'El titulo debe tener al menos 3 caracteres'),
  description: z.string().optional(),
  type: z.enum(['departamento', 'casa', 'villa', 'terreno', 'oficina', 'local'], {
    required_error: 'Selecciona un tipo de propiedad',
  }),
  operation: z.enum(['arriendo', 'venta'], {
    required_error: 'Selecciona tipo de operacion',
  }),
  price: z.coerce.number().positive('El precio debe ser mayor a 0'),
  currency: z.enum(['CLP', 'UF', 'USD']).default('CLP'),
  address: z.string().optional(),
  city: z.string().optional(),
  sector: z.string().optional(),
  bedrooms: z.coerce.number().int().min(0).optional(),
  bathrooms: z.coerce.number().int().min(0).optional(),
  sqm: z.coerce.number().positive().optional(),
})

export type PropertyFormData = z.infer<typeof propertySchema>
