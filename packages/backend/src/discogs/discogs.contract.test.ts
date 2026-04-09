import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createListing, updateListing, type ListingPayload } from './client'

process.env.DISCOGS_TOKEN = 'test-token'

const LISTINGS_URL = 'https://api.discogs.com/marketplace/listings'

const payload: ListingPayload = {
  release_id: 388,
  condition: 'Very Good Plus (VG+)',
  price: 24.99,
  status: 'For Sale',
  sleeve_condition: 'Very Good (VG)',
  comments: 'Original pressing',
}

function mockFetch(status: number, body: unknown) {
  return vi.spyOn(global, 'fetch').mockImplementation(async () =>
    new Response(
      status === 204 ? null : JSON.stringify(body),
      { status, headers: { 'Content-Type': 'application/json' } },
    ),
  )
}

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('Discogs client — create listing', () => {
  it('POSTs to /marketplace/listings', async () => {
    const spy = mockFetch(201, { listing_id: 123456, resource_url: `${LISTINGS_URL}/123456` })
    await createListing(payload)

    expect(spy).toHaveBeenCalledOnce()
    const [url, init] = spy.mock.calls[0]
    expect(url).toBe(LISTINGS_URL)
    expect((init as RequestInit).method).toBe('POST')
  })

  it('sends required fields in the request body', async () => {
    const spy = mockFetch(201, { listing_id: 123456, resource_url: `${LISTINGS_URL}/123456` })
    await createListing(payload)

    const body = JSON.parse((spy.mock.calls[0][1] as RequestInit).body as string)
    expect(body.release_id).toBe(388)
    expect(body.condition).toBe('Very Good Plus (VG+)')
    expect(body.price).toBe(24.99)
    expect(body.status).toBe('For Sale')
  })

  it('sends optional fields when provided', async () => {
    const spy = mockFetch(201, { listing_id: 123456, resource_url: `${LISTINGS_URL}/123456` })
    await createListing(payload)

    const body = JSON.parse((spy.mock.calls[0][1] as RequestInit).body as string)
    expect(body.sleeve_condition).toBe('Very Good (VG)')
    expect(body.comments).toBe('Original pressing')
  })

  it('returns the listing_id from the response', async () => {
    mockFetch(201, { listing_id: 123456, resource_url: `${LISTINGS_URL}/123456` })
    const result = await createListing(payload)
    expect(result.listing_id).toBe(123456)
  })
})

describe('Discogs client — update listing', () => {
  it('POSTs to /marketplace/listings/:id', async () => {
    const spy = mockFetch(204, null)
    await updateListing('123456', payload)

    const [url, init] = spy.mock.calls[0]
    expect(url).toBe(`${LISTINGS_URL}/123456`)
    expect((init as RequestInit).method).toBe('POST')
  })

  it('sends the correct payload on update', async () => {
    const spy = mockFetch(204, null)
    await updateListing('123456', { ...payload, price: 19.99 })

    const body = JSON.parse((spy.mock.calls[0][1] as RequestInit).body as string)
    expect(body.price).toBe(19.99)
    expect(body.release_id).toBe(388)
  })
})

describe('Discogs client — error handling', () => {
  it('throws immediately on 404 (terminal error, no retry)', async () => {
    const spy = mockFetch(404, { message: 'Not Found' })
    await expect(createListing(payload)).rejects.toThrow('Not Found')
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('retries on 429 and eventually throws after MAX_RETRIES', async () => {
    const spy = mockFetch(429, { message: 'Too Many Requests' })
    await expect(createListing(payload)).rejects.toThrow()
    expect(spy).toHaveBeenCalledTimes(3) // MAX_RETRIES = 3
  }, 15000)
})
