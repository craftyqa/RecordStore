import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createListing, updateListing, MAX_RETRIES, type ListingPayload } from './client'

const LISTINGS_URL = 'https://api.discogs.com/marketplace/listings'
const LISTING_ID = 123456
const CREATED_RESPONSE = { listing_id: LISTING_ID, resource_url: `${LISTINGS_URL}/${LISTING_ID}` }

const payload: ListingPayload = {
  release_id: 388,
  condition: 'Very Good Plus (VG+)',
  price: 24.99,
  status: 'For Sale',
  sleeve_condition: 'Very Good (VG)',
  comments: 'Original pressing',
}

type FetchSpy = ReturnType<typeof mockFetch>

function mockFetch(status: number, body: unknown) {
  return vi.spyOn(global, 'fetch').mockImplementation(async () =>
    new Response(
      status === 204 ? null : JSON.stringify(body),
      { status, headers: { 'Content-Type': 'application/json' } },
    ),
  )
}

function parsedBody(spy: FetchSpy) {
  return JSON.parse((spy.mock.calls[0][1] as RequestInit).body as string)
}

beforeEach(() => {
  vi.restoreAllMocks()
  vi.stubEnv('DISCOGS_TOKEN', 'test-token')
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('Discogs client — create listing', () => {
  it('POSTs to /marketplace/listings', async () => {
    const spy = mockFetch(201, CREATED_RESPONSE)
    await createListing(payload)

    expect(spy).toHaveBeenCalledOnce()
    const [url, init] = spy.mock.calls[0]
    expect(url).toBe(LISTINGS_URL)
    expect((init as RequestInit).method).toBe('POST')
  })

  it('sends all fields in the request body', async () => {
    const spy = mockFetch(201, CREATED_RESPONSE)
    await createListing(payload)

    expect(parsedBody(spy)).toMatchObject({
      release_id: 388,
      condition: 'Very Good Plus (VG+)',
      price: 24.99,
      status: 'For Sale',
      sleeve_condition: 'Very Good (VG)',
      comments: 'Original pressing',
    })
  })

  it('returns listing_id and resource_url from the response', async () => {
    mockFetch(201, CREATED_RESPONSE)
    const result = await createListing(payload)
    expect(result.listing_id).toBe(LISTING_ID)
    expect(result.resource_url).toBe(`${LISTINGS_URL}/${LISTING_ID}`)
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

    expect(parsedBody(spy)).toMatchObject({ price: 19.99, release_id: 388 })
  })

  it('resolves to undefined on 204', async () => {
    mockFetch(204, null)
    const result = await updateListing('123456', payload)
    expect(result).toBeUndefined()
  })
})

describe('Discogs client — request headers', () => {
  it('sends Authorization, Content-Type, and User-Agent headers', async () => {
    const spy = mockFetch(201, CREATED_RESPONSE)
    await createListing(payload)

    const headers = (spy.mock.calls[0][1] as RequestInit).headers as Record<string, string>
    expect(headers['Authorization']).toBe('Discogs token=test-token')
    expect(headers['Content-Type']).toBe('application/json')
    expect(headers['User-Agent']).toBe('RecordStoreApp/1.0')
  })

  it('throws when DISCOGS_TOKEN is not set', async () => {
    vi.unstubAllEnvs()
    await expect(createListing(payload)).rejects.toThrow('DISCOGS_TOKEN environment variable is not set')
  })
})

describe('Discogs client — error handling and retries', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('throws immediately on 404 (terminal error, no retry)', async () => {
    const spy = mockFetch(404, { message: 'Not Found' })
    await expect(createListing(payload)).rejects.toThrow('Not Found')
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('attaches the HTTP status code to the thrown error', async () => {
    mockFetch(422, { message: 'Unprocessable Entity' })
    const err = await createListing(payload).catch((e) => e)
    expect(err.status).toBe(422)
  })

  it('falls back to a generic message when the response body has no message field', async () => {
    mockFetch(422, { code: 'SOME_ERROR' })
    await expect(createListing(payload)).rejects.toThrow('Discogs error 422')
  })

  it('retries on 429 and eventually throws after MAX_RETRIES attempts', async () => {
    const spy = mockFetch(429, { message: 'Too Many Requests' })
    await Promise.all([
      expect(createListing(payload)).rejects.toThrow('Too Many Requests'),
      vi.runAllTimersAsync(),
    ])
    expect(spy).toHaveBeenCalledTimes(MAX_RETRIES)
  })

  it('retries on 500 and eventually throws after MAX_RETRIES attempts', async () => {
    const spy = mockFetch(500, { message: 'Internal Server Error' })
    await Promise.all([
      expect(createListing(payload)).rejects.toThrow('Internal Server Error'),
      vi.runAllTimersAsync(),
    ])
    expect(spy).toHaveBeenCalledTimes(MAX_RETRIES)
  })

  it('recovers and returns the result when a retry succeeds', async () => {
    let callCount = 0
    vi.spyOn(global, 'fetch').mockImplementation(async () => {
      callCount++
      if (callCount < MAX_RETRIES) {
        return new Response(JSON.stringify({ message: 'Too Many Requests' }), {
          status: 429,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      return new Response(JSON.stringify(CREATED_RESPONSE), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      })
    })

    const [result] = await Promise.all([createListing(payload), vi.runAllTimersAsync()])
    expect(result.listing_id).toBe(LISTING_ID)
    expect(callCount).toBe(MAX_RETRIES)
  })
})
