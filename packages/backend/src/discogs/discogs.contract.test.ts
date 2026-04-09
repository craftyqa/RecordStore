import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import { createListing, updateListing, type ListingPayload } from './client'

process.env.DISCOGS_TOKEN = 'test-token'

const LISTINGS_URL = 'https://api.discogs.com/marketplace/listings'

let capturedRequests: { url: string; method: string; body: unknown }[] = []

const server = setupServer(
  http.post(LISTINGS_URL, async ({ request }) => {
    const body = await request.json()
    capturedRequests.push({ url: request.url, method: request.method, body })
    return HttpResponse.json({ listing_id: 123456, resource_url: `${LISTINGS_URL}/123456` }, { status: 201 })
  }),
  http.post(`${LISTINGS_URL}/:listingId`, async ({ request }) => {
    const body = await request.json()
    capturedRequests.push({ url: request.url, method: request.method, body })
    return new HttpResponse(null, { status: 204 })
  }),
)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => { capturedRequests = []; server.resetHandlers() })
afterAll(() => server.close())

const payload: ListingPayload = {
  release_id: 388,
  condition: 'Very Good Plus (VG+)',
  price: 24.99,
  status: 'For Sale',
  sleeve_condition: 'Very Good (VG)',
  comments: 'Original pressing',
}

describe('Discogs client — create listing', () => {
  it('POSTs to /marketplace/listings', async () => {
    const result = await createListing(payload)
    expect(capturedRequests).toHaveLength(1)
    expect(capturedRequests[0].url).toBe(LISTINGS_URL)
    expect(capturedRequests[0].method).toBe('POST')
    expect(result.listing_id).toBe(123456)
  })

  it('sends required fields in the request body', async () => {
    await createListing(payload)
    const body = capturedRequests[0].body as Record<string, unknown>
    expect(body.release_id).toBe(388)
    expect(body.condition).toBe('Very Good Plus (VG+)')
    expect(body.price).toBe(24.99)
    expect(body.status).toBe('For Sale')
  })

  it('sends optional fields when provided', async () => {
    await createListing(payload)
    const body = capturedRequests[0].body as Record<string, unknown>
    expect(body.sleeve_condition).toBe('Very Good (VG)')
    expect(body.comments).toBe('Original pressing')
  })
})

describe('Discogs client — update listing', () => {
  it('POSTs to /marketplace/listings/:id', async () => {
    await updateListing('123456', payload)
    expect(capturedRequests).toHaveLength(1)
    expect(capturedRequests[0].url).toBe(`${LISTINGS_URL}/123456`)
    expect(capturedRequests[0].method).toBe('POST')
  })

  it('sends the correct payload on update', async () => {
    await updateListing('123456', { ...payload, price: 19.99 })
    const body = capturedRequests[0].body as Record<string, unknown>
    expect(body.price).toBe(19.99)
    expect(body.release_id).toBe(388)
  })
})

describe('Discogs client — error handling', () => {
  it('throws immediately on 404 (terminal error, no retry)', async () => {
    server.use(
      http.post(LISTINGS_URL, () => HttpResponse.json({ message: 'Not Found' }, { status: 404 })),
    )
    await expect(createListing(payload)).rejects.toThrow('Not Found')
    expect(capturedRequests).toHaveLength(0) // msw handler, not captured
  })

  it('retries on 429 and eventually throws', async () => {
    server.use(
      http.post(LISTINGS_URL, async ({ request }) => {
        const body = await request.json()
        capturedRequests.push({ url: request.url, method: request.method, body })
        return HttpResponse.json({ message: 'Too Many Requests' }, { status: 429 })
      }),
    )
    await expect(createListing(payload)).rejects.toThrow('Too Many Requests')
    expect(capturedRequests.length).toBe(3) // MAX_RETRIES = 3
  }, 15000)
})
