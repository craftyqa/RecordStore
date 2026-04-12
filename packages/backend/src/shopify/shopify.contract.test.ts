import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createProduct, updateProduct, MAX_RETRIES, type ProductPayload } from './client'

const STORE_DOMAIN = 'test-store.myshopify.com'
const API_VERSION = '2024-10'
const PRODUCTS_URL = `https://${STORE_DOMAIN}/admin/api/${API_VERSION}/products.json`
const PRODUCT_ID = 987654321
const VARIANT_ID = 111222333

const CREATED_RESPONSE = {
  product: {
    id: PRODUCT_ID,
    variants: [{ id: VARIANT_ID }],
  },
}

const payload: ProductPayload = {
  title: 'Dark Side of the Moon',
  tags: 'media:Near Mint (NM or M-), sleeve:Very Good Plus (VG+)',
  variants: [
    {
      price: '24.99',
      inventory_quantity: 1,
      inventory_management: 'shopify',
    },
  ],
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
  vi.stubEnv('SHOPIFY_STORE_DOMAIN', STORE_DOMAIN)
  vi.stubEnv('SHOPIFY_ACCESS_TOKEN', 'test-access-token')
  vi.stubEnv('SHOPIFY_API_VERSION', API_VERSION)
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('Shopify client — create product', () => {
  it('POSTs to /products.json', async () => {
    const spy = mockFetch(201, CREATED_RESPONSE)
    await createProduct(payload)

    expect(spy).toHaveBeenCalledOnce()
    const [url, init] = spy.mock.calls[0]
    expect(url).toBe(PRODUCTS_URL)
    expect((init as RequestInit).method).toBe('POST')
  })

  it('wraps payload in a product envelope', async () => {
    const spy = mockFetch(201, CREATED_RESPONSE)
    await createProduct(payload)

    const body = parsedBody(spy)
    expect(body).toHaveProperty('product')
    expect(body.product).toMatchObject({
      title: 'Dark Side of the Moon',
      variants: [{ price: '24.99', inventory_quantity: 1, inventory_management: 'shopify' }],
    })
  })

  it('returns product id and variant ids from the response', async () => {
    mockFetch(201, CREATED_RESPONSE)
    const result = await createProduct(payload)
    expect(result.product.id).toBe(PRODUCT_ID)
    expect(result.product.variants[0].id).toBe(VARIANT_ID)
  })
})

describe('Shopify client — update product', () => {
  it('PUTs to /products/:id.json', async () => {
    const spy = mockFetch(200, CREATED_RESPONSE)
    await updateProduct(String(PRODUCT_ID), payload)

    const [url, init] = spy.mock.calls[0]
    expect(url).toBe(`https://${STORE_DOMAIN}/admin/api/${API_VERSION}/products/${PRODUCT_ID}.json`)
    expect((init as RequestInit).method).toBe('PUT')
  })

  it('sends updated price in the payload', async () => {
    const spy = mockFetch(200, CREATED_RESPONSE)
    await updateProduct(String(PRODUCT_ID), { ...payload, variants: [{ ...payload.variants[0], price: '19.99' }] })

    const body = parsedBody(spy)
    expect(body.product.variants[0].price).toBe('19.99')
  })
})

describe('Shopify client — request headers', () => {
  it('sends X-Shopify-Access-Token and Content-Type headers', async () => {
    const spy = mockFetch(201, CREATED_RESPONSE)
    await createProduct(payload)

    const headers = (spy.mock.calls[0][1] as RequestInit).headers as Record<string, string>
    expect(headers['X-Shopify-Access-Token']).toBe('test-access-token')
    expect(headers['Content-Type']).toBe('application/json')
  })

  it('throws when SHOPIFY_STORE_DOMAIN is not set', async () => {
    vi.unstubAllEnvs()
    vi.stubEnv('SHOPIFY_ACCESS_TOKEN', 'test-access-token')
    await expect(createProduct(payload)).rejects.toThrow('SHOPIFY_STORE_DOMAIN environment variable is not set')
  })

  it('throws when SHOPIFY_ACCESS_TOKEN is not set', async () => {
    vi.unstubAllEnvs()
    vi.stubEnv('SHOPIFY_STORE_DOMAIN', STORE_DOMAIN)
    await expect(createProduct(payload)).rejects.toThrow('SHOPIFY_ACCESS_TOKEN environment variable is not set')
  })
})

describe('Shopify client — error handling and retries', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('throws immediately on 422 (terminal error, no retry)', async () => {
    const spy = mockFetch(422, { errors: 'Title is too long' })
    await expect(createProduct(payload)).rejects.toThrow('Title is too long')
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('attaches the HTTP status code to the thrown error', async () => {
    mockFetch(422, { errors: 'Unprocessable Entity' })
    const err = await createProduct(payload).catch((e) => e)
    expect(err.status).toBe(422)
  })

  it('falls back to a generic message when the response body has no errors field', async () => {
    mockFetch(422, { code: 'SOME_ERROR' })
    await expect(createProduct(payload)).rejects.toThrow('Shopify error 422')
  })

  it('retries on 429 and eventually throws after MAX_RETRIES attempts', async () => {
    const spy = mockFetch(429, { errors: 'Too Many Requests' })
    await Promise.all([
      expect(createProduct(payload)).rejects.toThrow('Too Many Requests'),
      vi.runAllTimersAsync(),
    ])
    expect(spy).toHaveBeenCalledTimes(MAX_RETRIES)
  })

  it('retries on 500 and eventually throws after MAX_RETRIES attempts', async () => {
    const spy = mockFetch(500, { errors: 'Internal Server Error' })
    await Promise.all([
      expect(createProduct(payload)).rejects.toThrow('Internal Server Error'),
      vi.runAllTimersAsync(),
    ])
    expect(spy).toHaveBeenCalledTimes(MAX_RETRIES)
  })

  it('recovers and returns the result when a retry succeeds', async () => {
    let callCount = 0
    vi.spyOn(global, 'fetch').mockImplementation(async () => {
      callCount++
      if (callCount < MAX_RETRIES) {
        return new Response(JSON.stringify({ errors: 'Too Many Requests' }), {
          status: 429,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      return new Response(JSON.stringify(CREATED_RESPONSE), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      })
    })

    const [result] = await Promise.all([createProduct(payload), vi.runAllTimersAsync()])
    expect(result.product.id).toBe(PRODUCT_ID)
    expect(callCount).toBe(MAX_RETRIES)
  })
})
