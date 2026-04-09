import { z } from 'zod'

export const createItemSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  quantity: z.number().int().min(0).default(0),
  price: z.number().positive('Price must be positive'),
  media_condition: z.string().optional(),
  sleeve_condition: z.string().optional(),
  comments: z.string().optional(),
  discogs_id: z.string().regex(/^r?\d+$/i, 'Must be a numeric ID or rNNN format (e.g. r388 or 388)').optional(),
})

export const updateItemSchema = createItemSchema.partial().extend({
  version: z.number().int().min(1, 'version must be a positive integer'),
})

export const bulkPriceSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, 'At least one item is required'),
  price: z.number().positive('Price must be positive'),
})

export type CreateItemInput = z.infer<typeof createItemSchema>
export type UpdateItemInput = z.infer<typeof updateItemSchema>
export type BulkPriceInput = z.infer<typeof bulkPriceSchema>
