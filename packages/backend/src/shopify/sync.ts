import * as client from './client'
import * as repo from '../items/repository'

export async function syncItemToShopify(id: string): Promise<void> {
  const item = await repo.getById(id)
  if (!item) throw new Error('Item not found')
  if (item.quantity < 1) throw new Error('Item must have a quantity of at least 1 to sync to Shopify')

  const tags = [
    item.media_condition ? `media:${item.media_condition}` : null,
    item.sleeve_condition ? `sleeve:${item.sleeve_condition}` : null,
  ]
    .filter(Boolean)
    .join(', ')

  const payload: client.ProductPayload = {
    title: item.title,
    tags: tags || undefined,
    variants: [
      {
        price: parseFloat(item.price.toString()).toFixed(2),
        inventory_quantity: item.quantity,
        inventory_management: 'shopify',
      },
    ],
  }

  try {
    if (item.shopify_product_id) {
      const result = await client.updateProduct(item.shopify_product_id, payload)
      const variantId = result.product.variants[0]?.id
      await repo.update(id, {
        shopify_product_id: String(result.product.id),
        shopify_variant_id: variantId != null ? String(variantId) : undefined,
        shopify_sync_status: 'listed',
        shopify_sync_error: null,
        shopify_synced_at: new Date(),
      })
    } else {
      const result = await client.createProduct(payload)
      const variantId = result.product.variants[0]?.id
      await repo.update(id, {
        shopify_product_id: String(result.product.id),
        shopify_variant_id: variantId != null ? String(variantId) : undefined,
        shopify_sync_status: 'listed',
        shopify_sync_error: null,
        shopify_synced_at: new Date(),
      })
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    await repo.update(id, {
      shopify_sync_status: 'error',
      shopify_sync_error: message,
    })
    throw err
  }
}
