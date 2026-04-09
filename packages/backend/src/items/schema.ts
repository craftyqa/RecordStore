import { z } from 'zod'

export const createItemSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  quantity: z.number().int().min(0).default(0),
  price: z.number().positive('Price must be positive'),
  media_condition: z.string().optional(),
  sleeve_condition: z.string().optional(),
  comments: z.string().optional(),
  discogs_id: z.string().optional(),
})

export const updateItemSchema = createItemSchema.partial().extend({
  version: z.number().int().positive('version is required for updates'),
})

export const bulkPriceSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, 'At least one item is required'),
  price: z.number().positive('Price must be positive'),
})

export type CreateItemInput = z.infer<typeof createItemSchema>
export type UpdateItemInput = z.infer<typeof updateItemSchema>
export type BulkPriceInput = z.infer<typeof bulkPriceSchema>
