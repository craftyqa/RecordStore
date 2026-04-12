export interface Item {
  id: string
  title: string
  quantity: number
  price: string // Prisma Decimal serialises as string in JSON
  media_condition: string | null
  sleeve_condition: string | null
  comments: string | null
  discogs_id: string | null
  discogs_listing_id: string | null
  discogs_sync_status: 'never' | 'listed' | 'error'
  discogs_sync_error: string | null
  discogs_synced_at: string | null
  shopify_product_id: string | null
  shopify_variant_id: string | null
  shopify_sync_status: 'never' | 'listed' | 'error'
  shopify_sync_error: string | null
  shopify_synced_at: string | null
  version: number
  created_at: string
  updated_at: string
}

export interface ListResponse {
  data: Item[]
  page: number
  limit: number
}

export interface DetailResponse {
  data: Item
}
