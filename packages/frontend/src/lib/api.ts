import type { DetailResponse, ListResponse } from '@/types/item'

const API_BASE = import.meta.env.VITE_API_URL ?? '/api'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, init)
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
    list: (page = 1, limit = 20, search?: string) => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      if (search) params.set('search', search)
      return request<ListResponse>(`/items?${params}`)
    },
    get: (id: string) =>
      request<DetailResponse>(`/items/${id}`),
    create: (data: unknown) =>
      request<DetailResponse>('/items', json('POST', data)),
    update: (id: string, data: unknown & { version: number }) =>
      request<DetailResponse>(`/items/${id}`, json('PATCH', data)),
    bulkUpdatePrice: (ids: string[], price: number) =>
      request<{ count: number }>('/items/prices/bulk', json('PATCH', { ids, price })),
    syncToDiscogs: (id: string) =>
      request<DetailResponse>(`/items/${id}/sync/discogs`, { method: 'POST' }),
    syncToShopify: (id: string) =>
      request<DetailResponse>(`/items/${id}/sync/shopify`, { method: 'POST' }),
    uploadImage: (file: File) => {
      const formData = new FormData()
      formData.append('image', file)
      return request<{ path: string }>('/items/images', { method: 'POST', body: formData })
    },
  },
}
