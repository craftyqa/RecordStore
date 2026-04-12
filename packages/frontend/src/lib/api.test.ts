import { describe, it, expect, vi, beforeEach } from 'vitest'
import { api } from './api'

function mockFetch(status: number, body: unknown) {
  return vi.spyOn(global, 'fetch').mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  )
}

beforeEach(() => vi.restoreAllMocks())

describe('api.items.get', () => {
  it('returns parsed JSON on a successful response', async () => {
    mockFetch(200, { data: { id: '1', title: 'Kind of Blue' } })
    const result = await api.items.get('1')
    expect(result.data.title).toBe('Kind of Blue')
  })

  it('throws with the message from the error response body', async () => {
    mockFetch(404, { message: 'Item not found' })
    await expect(api.items.get('missing')).rejects.toThrow('Item not found')
  })

  it('attaches the HTTP status code to the thrown error', async () => {
    mockFetch(404, { message: 'Item not found' })
    const err = await api.items.get('missing').catch((e) => e)
    expect(err.status).toBe(404)
  })

  it('attaches the parsed body to the thrown error', async () => {
    mockFetch(409, { code: 'VERSION_CONFLICT', message: 'Stale version' })
    const err = await api.items.get('1').catch((e) => e)
    expect(err.body).toMatchObject({ code: 'VERSION_CONFLICT' })
  })

  it('falls back to "Request failed" when the response body has no message field', async () => {
    mockFetch(500, { code: 'INTERNAL_ERROR' })
    await expect(api.items.get('1')).rejects.toThrow('Request failed')
  })
})

describe('api.items.create', () => {
  it('sends a POST with a JSON body', async () => {
    const spy = mockFetch(201, { data: { id: '1' } })
    await api.items.create({ title: 'New', price: 9.99, quantity: 1 })
    const [, init] = spy.mock.calls[0]
    expect((init as RequestInit).method).toBe('POST')
    expect((init as RequestInit & { headers: Record<string, string> }).headers['Content-Type']).toBe(
      'application/json',
    )
  })

  it('serialises the body as JSON', async () => {
    const spy = mockFetch(201, { data: { id: '1' } })
    await api.items.create({ title: 'New', price: 9.99, quantity: 1 })
    const body = JSON.parse((spy.mock.calls[0][1] as RequestInit).body as string)
    expect(body).toMatchObject({ title: 'New', price: 9.99 })
  })
})

describe('api.items.update', () => {
  it('sends a PATCH to the item URL', async () => {
    const spy = mockFetch(200, { data: { id: 'abc' } })
    await api.items.update('abc', { version: 1, price: 19.99 })
    const [url, init] = spy.mock.calls[0]
    expect(url).toContain('/items/abc')
    expect((init as RequestInit).method).toBe('PATCH')
  })
})

describe('api.items.bulkUpdatePrice', () => {
  it('sends the ids and price in the request body', async () => {
    const spy = mockFetch(200, { count: 2 })
    await api.items.bulkUpdatePrice(['id-1', 'id-2'], 19.99)
    const body = JSON.parse((spy.mock.calls[0][1] as RequestInit).body as string)
    expect(body).toEqual({ ids: ['id-1', 'id-2'], price: 19.99 })
  })
})

describe('api.items.syncToDiscogs', () => {
  it('sends a POST to the sync endpoint', async () => {
    const spy = mockFetch(200, { data: { id: '1' } })
    await api.items.syncToDiscogs('1')
    const [url, init] = spy.mock.calls[0]
    expect(url).toContain('/items/1/sync/discogs')
    expect((init as RequestInit).method).toBe('POST')
  })
})
