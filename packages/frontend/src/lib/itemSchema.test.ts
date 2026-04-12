import { describe, it, expect } from 'vitest'
import { itemFormSchema } from './itemSchema'

describe('itemFormSchema', () => {
  const valid = { title: 'Rumours', price: '14.99', quantity: '1' }

  it('coerces price from string to number', () => {
    const result = itemFormSchema.parse(valid)
    expect(result.price).toBe(14.99)
  })

  it('coerces quantity from string to number', () => {
    const result = itemFormSchema.parse(valid)
    expect(result.quantity).toBe(1)
  })

  it('defaults quantity to 0 when omitted', () => {
    const result = itemFormSchema.parse({ title: 'Test', price: '5' })
    expect(result.quantity).toBe(0)
  })

  it('rejects an empty title', () => {
    expect(() => itemFormSchema.parse({ ...valid, title: '' })).toThrow()
  })

  it('rejects a zero price', () => {
    expect(() => itemFormSchema.parse({ ...valid, price: '0' })).toThrow()
  })

  it('rejects a negative price', () => {
    expect(() => itemFormSchema.parse({ ...valid, price: '-5' })).toThrow()
  })

  it('transforms empty discogs_id to undefined', () => {
    const result = itemFormSchema.parse({ ...valid, discogs_id: '' })
    expect(result.discogs_id).toBeUndefined()
  })

  it('preserves a non-empty discogs_id', () => {
    const result = itemFormSchema.parse({ ...valid, discogs_id: 'r388' })
    expect(result.discogs_id).toBe('r388')
  })

  it('optional fields are absent when not provided', () => {
    const result = itemFormSchema.parse(valid)
    expect(result.media_condition).toBeUndefined()
    expect(result.sleeve_condition).toBeUndefined()
    expect(result.comments).toBeUndefined()
    expect(result.discogs_id).toBeUndefined()
  })

  it('passes optional fields through when provided', () => {
    const result = itemFormSchema.parse({
      ...valid,
      media_condition: 'Near Mint (NM or M-)',
      sleeve_condition: 'Very Good (VG)',
      comments: 'Original pressing',
    })
    expect(result.media_condition).toBe('Near Mint (NM or M-)')
    expect(result.sleeve_condition).toBe('Very Good (VG)')
    expect(result.comments).toBe('Original pressing')
  })
})
