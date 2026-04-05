import * as client from './client'
import * as repo from '../items/repository'

// Valid Discogs marketplace condition strings.
// Stored as-is in the DB and sent directly to the API.
const VALID_CONDITIONS = new Set([
  'Mint (M)',
  'Near Mint (NM or M-)',
  'Very Good Plus (VG+)',
  'Very Good (VG)',
  'Good Plus (G+)',
  'Good (G)',
  'Fair (F)',
  'Poor (P)',
])

function parseReleaseId(discogsId: string): number {
  const numeric = discogsId.replace(/^r/i, '')
  const id = parseInt(numeric, 10)
  if (isNaN(id)) throw new Error(`Invalid Discogs release ID: "${discogsId}"`)
  return id
}

function validateCondition(value: string | null, field: string): string {
  if (!value) throw new Error(`${field} is required to sync to Discogs`)
  if (!VALID_CONDITIONS.has(value)) {
    throw new Error(`Unrecognised ${field}: "${value}". Valid values: ${[...VALID_CONDITIONS].join(', ')}`)
  }
  return value
}

export async function syncItemToDiscogs(id: string): Promise<void> {
  const item = await repo.getById(id)
  if (!item) throw new Error('Item not found')
  if (!item.discogs_id) throw new Error('Item has no Discogs release ID (discogs_id). Set it before syncing.')

  const payload: client.ListingPayload = {
    release_id: parseReleaseId(item.discogs_id),
    condition: validateCondition(item.media_condition, 'media_condition'),
    price: parseFloat(item.price.toString()),
    status: 'For Sale',
    sleeve_condition: item.sleeve_condition ? validateCondition(item.sleeve_condition, 'sleeve_condition') : undefined,
    comments: item.comments ?? undefined,
  }

  try {
    if (item.discogs_listing_id) {
      await client.updateListing(item.discogs_listing_id, payload)
      await repo.update(id, {
        discogs_sync_status: 'listed',
        discogs_sync_error: null,
        discogs_synced_at: new Date(),
      })
    } else {
      const result = await client.createListing(payload)
      await repo.update(id, {
        discogs_listing_id: String(result.listing_id),
        discogs_sync_status: 'listed',
        discogs_sync_error: null,
        discogs_synced_at: new Date(),
      })
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    await repo.update(id, {
      discogs_sync_status: 'error',
      discogs_sync_error: message,
    })
    throw err
  }
}
