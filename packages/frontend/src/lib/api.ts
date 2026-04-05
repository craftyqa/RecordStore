import type { DetailResponse, ListResponse } from '@/types/item'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, init)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw Object.assign(new Error(body.message ?? 'Request failed'), { status: res.status, body })
  }
  return res.json()
}

function json(method: string, body: unknown): RequestInit {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }
}

export const api = {
  items: {
    list: (page = 1, limit = 20) =>
      request<ListResponse>(`/items?page=${page}&limit=${limit}`),
    get: (id: string) =>
      request<DetailResponse>(`/items/${id}`),
    create: (data: unknown) =>
      request<DetailResponse>('/items', json('POST', data)),
    update: (id: string, data: unknown) =>
      request<DetailResponse>(`/items/${id}`, json('PATCH', data)),
    bulkUpdatePrice: (ids: string[], price: number) =>
      request<{ count: number }>('/items/prices/bulk', json('PATCH', { ids, price })),
    syncToDiscogs: (id: string) =>
      request<DetailResponse>(`/items/${id}/sync/discogs`, { method: 'POST' }),
  },
}
