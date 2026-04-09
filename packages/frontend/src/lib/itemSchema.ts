import { z } from 'zod'

export const itemFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  price: z.coerce.number().positive('Price must be positive'),
  quantity: z.coerce.number().int().min(0).default(0),
  media_condition: z.string().optional(),
  sleeve_condition: z.string().optional(),
  comments: z.string().optional(),
  // Transform empty string → undefined so the backend regex validator never
  // sees "" as a value (backend requires r?\d+ format when a value is present).
  discogs_id: z
    .string()
    .optional()
    .transform((val) => (val === '' ? undefined : val)),
})

export type ItemFormValues = z.infer<typeof itemFormSchema>
