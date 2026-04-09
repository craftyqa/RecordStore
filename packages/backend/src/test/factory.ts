import { Prisma } from '@prisma/client'

let sequence = 0

export function makeItem(overrides: Partial<Prisma.ItemCreateInput> = {}): Prisma.ItemCreateInput {
  sequence++
  return {
    title: `Test Record ${sequence}`,
    quantity: 1,
    price: 9.99,
    media_condition: 'Very Good Plus (VG+)',
    sleeve_condition: 'Very Good (VG)',
    comments: null,
    discogs_id: null,
    ...overrides,
  }
}
