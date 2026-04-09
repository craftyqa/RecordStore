const BASE_URL = 'https://api.discogs.com'
const USER_AGENT = 'RecordStoreApp/1.0'

const MAX_RETRIES = 3
const BASE_DELAY_MS = 500

export interface ListingPayload {
  release_id: number
  condition: string
  price: number
  status: string
  sleeve_condition?: string
  comments?: string
}

export interface CreateListingResponse {
  listing_id: number
  resource_url: string
}

function getToken(): string {
  const token = process.env.DISCOGS_TOKEN
  if (!token) throw new Error('DISCOGS_TOKEN environment variable is not set')
  return token
}

function authHeaders() {
  return {
    Authorization: `Discogs token=${getToken()}`,
    'Content-Type': 'application/json',
    'User-Agent': USER_AGENT,
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

async function discogsRequest<T>(path: string, method: string, body?: unknown): Promise<T> {
  let lastError: Error & { status?: number } = new Error('Unknown error')

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const delay = backoffMs(attempt - 1)
      console.log(`[discogs] retry ${attempt}/${MAX_RETRIES - 1} for ${method} ${path} — waiting ${delay}ms`)
      await sleep(delay)
    }

    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: authHeaders(),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })

    if (res.ok) {
      console.log(`[discogs] ${method} ${path} → ${res.status}`)
      if (res.status === 204) return undefined as T
      return res.json()
    }

    const data = await res.json().catch(() => ({}))
    const message = (data as { message?: string }).message ?? `Discogs error ${res.status}`
    lastError = Object.assign(new Error(message), { status: res.status })

    if (!isRetryable(res.status)) {
      console.error(`[discogs] ${method} ${path} → ${res.status} (terminal): ${message}`)
      throw lastError
    }

    console.warn(`[discogs] ${method} ${path} → ${res.status} (retryable): ${message}`)
  }

  console.error(`[discogs] ${method} ${path} — all ${MAX_RETRIES} attempts failed`)
  throw lastError
}

export function createListing(payload: ListingPayload): Promise<CreateListingResponse> {
  return discogsRequest<CreateListingResponse>('/marketplace/listings', 'POST', payload)
}

export function updateListing(listingId: string, payload: ListingPayload): Promise<void> {
  return discogsRequest<void>(`/marketplace/listings/${listingId}`, 'POST', payload)
}
