import { describe, it, expect } from 'vitest'
import { createItemSchema, updateItemSchema, bulkPriceSchema } from './schema'

const VALID_UUID = '00000000-0000-0000-0000-000000000001'

describe('createItemSchema', () => {
  const valid = { title: 'Kind of Blue', price: 24.99, quantity: 1 }

  it('accepts a minimal valid record', () => {
    expect(() => createItemSchema.parse(valid)).not.toThrow()
  })

  it('defaults quantity to 0 when omitted', () => {
    const result = createItemSchema.parse({ title: 'Test', price: 9.99 })
    expect(result.quantity).toBe(0)
  })

  it('rejects an empty title', () => {
    expect(() => createItemSchema.parse({ ...valid, title: '' })).toThrow()
  })

  it('rejects a zero price', () => {
    expect(() => createItemSchema.parse({ ...valid, price: 0 })).toThrow()
  })

  it('rejects a negative price', () => {
    expect(() => createItemSchema.parse({ ...valid, price: -1 })).toThrow()
  })

  it('rejects a negative quantity', () => {
    expect(() => createItemSchema.parse({ ...valid, quantity: -1 })).toThrow()
  })

  it('accepts an r-prefixed discogs_id', () => {
    const result = createItemSchema.parse({ ...valid, discogs_id: 'r388' })
    expect(result.discogs_id).toBe('r388')
  })

  it('accepts a numeric-only discogs_id', () => {
    const result = createItemSchema.parse({ ...valid, discogs_id: '388' })
    expect(result.discogs_id).toBe('388')
  })

  it('accepts an uppercase R-prefixed discogs_id', () => {
    const result = createItemSchema.parse({ ...valid, discogs_id: 'R388' })
    expect(result.discogs_id).toBe('R388')
  })

  it('rejects a non-numeric discogs_id', () => {
    expect(() => createItemSchema.parse({ ...valid, discogs_id: 'abc' })).toThrow()
  })

  it('optional fields are absent when not provided', () => {
    const result = createItemSchema.parse(valid)
    expect(result.media_condition).toBeUndefined()
    expect(result.sleeve_condition).toBeUndefined()
    expect(result.comments).toBeUndefined()
    expect(result.discogs_id).toBeUndefined()
  })
})

describe('updateItemSchema', () => {
  const valid = { title: 'Updated', price: 19.99, quantity: 1, version: 2 }

  it('accepts a full valid update', () => {
    expect(() => updateItemSchema.parse(valid)).not.toThrow()
  })

  it('accepts a partial update — only version is required', () => {
    expect(() => updateItemSchema.parse({ version: 1, price: 9.99 })).not.toThrow()
  })

  it('rejects an update without version', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { version: _version, ...withoutVersion } = valid
    expect(() => updateItemSchema.parse(withoutVersion)).toThrow()
  })

  it('rejects version 0', () => {
    expect(() => updateItemSchema.parse({ ...valid, version: 0 })).toThrow()
  })

  it('rejects a negative version', () => {
    expect(() => updateItemSchema.parse({ ...valid, version: -1 })).toThrow()
  })

  it('inherits discogs_id validation from createItemSchema', () => {
    expect(() => updateItemSchema.parse({ version: 1, discogs_id: 'abc' })).toThrow()
  })
})

describe('bulkPriceSchema', () => {
  const valid = { ids: [VALID_UUID], price: 9.99 }

  it('accepts valid input', () => {
    expect(() => bulkPriceSchema.parse(valid)).not.toThrow()
  })

  it('accepts multiple UUIDs', () => {
    const result = bulkPriceSchema.parse({
      ids: [VALID_UUID, '00000000-0000-0000-0000-000000000002'],
      price: 9.99,
    })
    expect(result.ids).toHaveLength(2)
  })

  it('rejects an empty ids array', () => {
    expect(() => bulkPriceSchema.parse({ ...valid, ids: [] })).toThrow()
  })

  it('rejects non-UUID ids', () => {
    expect(() => bulkPriceSchema.parse({ ...valid, ids: ['not-a-uuid'] })).toThrow()
  })

  it('rejects a zero price', () => {
    expect(() => bulkPriceSchema.parse({ ...valid, price: 0 })).toThrow()
  })

  it('rejects a negative price', () => {
    expect(() => bulkPriceSchema.parse({ ...valid, price: -5 })).toThrow()
  })
})
