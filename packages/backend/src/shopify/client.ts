const API_VERSION = process.env.SHOPIFY_API_VERSION ?? '2024-10'

export const MAX_RETRIES = 3
const BASE_DELAY_MS = 500

export interface ProductVariant {
  id?: number
  price: string
  inventory_quantity: number
  inventory_management: 'shopify'
}

export interface ProductPayload {
  title: string
  tags?: string
  variants: ProductVariant[]
}

export interface ProductResponse {
  product: {
    id: number
    variants: Array<{ id: number }>
  }
}

function getCredentials(): { storeDomain: string; accessToken: string } {
  const storeDomain = process.env.SHOPIFY_STORE_DOMAIN
  const accessToken = process.env.SHOPIFY_ACCESS_TOKEN
  if (!storeDomain) throw new Error('SHOPIFY_STORE_DOMAIN environment variable is not set')
  if (!accessToken) throw new Error('SHOPIFY_ACCESS_TOKEN environment variable is not set')
  return { storeDomain, accessToken }
}

function baseUrl(): string {
  const { storeDomain } = getCredentials()
  return `https://${storeDomain}/admin/api/${API_VERSION}`
}

function authHeaders(): Record<string, string> {
  const { accessToken } = getCredentials()
  return {
    'X-Shopify-Access-Token': accessToken,
    'Content-Type': 'application/json',
  }
}

function isRetryable(status: number): boolean {
  return status === 429 || status >= 500
}

function backoffMs(attempt: number): number {
  // Exponential backoff with jitter: 500ms, 1000ms, 2000ms ± up to 20%
  const base = BASE_DELAY_MS * Math.pow(2, attempt)
  const jitter = base * 0.2 * Math.random()
  return Math.round(base + jitter)
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function shopifyRequest<T>(path: string, method: string, body?: unknown): Promise<T> {
  let lastError: Error & { status?: number } = new Error('Unknown error')

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const delay = backoffMs(attempt - 1)
      console.log(`[shopify] retry ${attempt}/${MAX_RETRIES - 1} for ${method} ${path} — waiting ${delay}ms`)
      await sleep(delay)
    }

    const url = `${baseUrl()}${path}`
    const res = await fetch(url, {
      method,
      headers: authHeaders(),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })

    if (res.ok) {
      console.log(`[shopify] ${method} ${path} → ${res.status}`)
      if (res.status === 204) return undefined as unknown as T
      return res.json() as Promise<T>
    }

    const data = await res.json().catch(() => ({}))
    const errors = (data as { errors?: unknown }).errors
    const message =
      typeof errors === 'string'
        ? errors
        : errors != null
          ? JSON.stringify(errors)
          : `Shopify error ${res.status}`
    lastError = Object.assign(new Error(message), { status: res.status })

    if (!isRetryable(res.status)) {
      console.error(`[shopify] ${method} ${path} → ${res.status} (terminal): ${message}`)
      throw lastError
    }

    console.warn(`[shopify] ${method} ${path} → ${res.status} (retryable): ${message}`)
  }

  console.error(`[shopify] ${method} ${path} — all ${MAX_RETRIES} attempts failed`)
  throw lastError
}

export function createProduct(payload: ProductPayload): Promise<ProductResponse> {
  return shopifyRequest<ProductResponse>('/products.json', 'POST', { product: payload })
}

export function updateProduct(productId: string, payload: ProductPayload): Promise<ProductResponse> {
  return shopifyRequest<ProductResponse>(`/products/${productId}.json`, 'PUT', { product: payload })
}
