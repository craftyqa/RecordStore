const BASE_URL = 'https://api.discogs.com'
const USER_AGENT = 'RecordStoreApp/1.0'

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

async function discogsRequest<T>(path: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: authHeaders(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    const message = (data as { message?: string }).message ?? `Discogs error ${res.status}`
    throw Object.assign(new Error(message), { status: res.status })
  }

  // 204 No Content — no body to parse
  if (res.status === 204) return undefined as T
  return res.json()
}

export function createListing(payload: ListingPayload): Promise<CreateListingResponse> {
  return discogsRequest<CreateListingResponse>('/marketplace/listings', 'POST', payload)
}

export function updateListing(listingId: string, payload: ListingPayload): Promise<void> {
  return discogsRequest<void>(`/marketplace/listings/${listingId}`, 'POST', payload)
}
