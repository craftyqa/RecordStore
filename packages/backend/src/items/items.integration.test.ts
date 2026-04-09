import { describe, it, expect } from 'vitest'
import * as repo from './repository'
import { makeItem } from '../test/factory'

describe('items repository', () => {
  it('inserts and retrieves an item by id', async () => {
    const item = await repo.insert(makeItem({ title: 'Kind of Blue' }))
    const found = await repo.getById(item.id)
    expect(found).not.toBeNull()
    expect(found!.title).toBe('Kind of Blue')
  })

  it('lists items with pagination', async () => {
    await repo.insert(makeItem({ title: 'Record A' }))
    await repo.insert(makeItem({ title: 'Record B' }))
    await repo.insert(makeItem({ title: 'Record C' }))

    const page1 = await repo.list(1, 2)
    expect(page1).toHaveLength(2)

    const page2 = await repo.list(2, 2)
    expect(page2).toHaveLength(1)
  })

  it('updates an item and increments version', async () => {
    const item = await repo.insert(makeItem())
    expect(item.version).toBe(1)

    const count = await repo.updateWithVersion(item.id, 1, { title: 'Updated Title' })
    expect(count).toBe(1)

    const updated = await repo.getById(item.id)
    expect(updated!.title).toBe('Updated Title')
    expect(updated!.version).toBe(2)
  })

  it('returns 0 on version mismatch', async () => {
    const item = await repo.insert(makeItem())
    const count = await repo.updateWithVersion(item.id, 99, { title: 'Should Not Update' })
    expect(count).toBe(0)

    const unchanged = await repo.getById(item.id)
    expect(unchanged!.title).toBe(item.title)
  })

  it('bulk updates price for selected ids', async () => {
    const a = await repo.insert(makeItem({ price: 10 }))
    const b = await repo.insert(makeItem({ price: 10 }))
    const c = await repo.insert(makeItem({ price: 10 }))

    const result = await repo.bulkUpdatePrice([a.id, b.id], 25)
    expect(result.count).toBe(2)

    const updatedA = await repo.getById(a.id)
    const updatedB = await repo.getById(b.id)
    const unchangedC = await repo.getById(c.id)

    expect(Number(updatedA!.price)).toBe(25)
    expect(Number(updatedB!.price)).toBe(25)
    expect(Number(unchangedC!.price)).toBe(10)
  })

  it('returns null for a missing id', async () => {
    const result = await repo.getById('00000000-0000-0000-0000-000000000000')
    expect(result).toBeNull()
  })
})
