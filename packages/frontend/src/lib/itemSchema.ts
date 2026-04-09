import { z } from 'zod'

export const itemFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  price: z.coerce.number().positive('Price must be positive'),
  quantity: z.coerce.number().int().min(0).default(0),
  media_condition: z.string().optional(),
  sleeve_condition: z.string().optional(),
  comments: z.string().optional(),
  discogs_id: z.string().optional(),
})

export type ItemFormValues = z.infer<typeof itemFormSchema>
