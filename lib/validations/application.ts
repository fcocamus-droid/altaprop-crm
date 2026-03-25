import { z } from 'zod'

export const applicationSchema = z.object({
  property_id: z.string().uuid(),
  message: z.string().min(10, 'El mensaje debe tener al menos 10 caracteres'),
})

export type ApplicationFormData = z.infer<typeof applicationSchema>
