import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as repo from './repository'
import { syncItemToDiscogs } from '../discogs/sync'
import { makeItem } from '../test/factory'

process.env.DISCOGS_TOKEN = 'test-token'

const LISTINGS_URL = 'https://api.discogs.com/marketplace/listings'

function mockFetchSuccess() {
  return vi.spyOn(global, 'fetch').mockResolvedValue(
    new Response(
      JSON.stringify({ listing_id: 999, resource_url: `${LISTINGS_URL}/999` }),
      { status: 201, headers: { 'Content-Type': 'application/json' } },
    ),
  )
}

function mockFetchError(status: number, message: string) {
  return vi.spyOn(global, 'fetch').mockResolvedValue(
    new Response(
      JSON.stringify({ message }),
      { status, headers: { 'Content-Type': 'application/json' } },
    ),
  )
}

beforeEach(() => {
  vi.restoreAllMocks()
})

// ---------------------------------------------------------------------------
// Test A — bulk price update while sync is in flight
// ---------------------------------------------------------------------------
describe('Test A: bulk price update concurrent with sync', () => {
  it('price update and sync status are both recorded — no silent overwrite', async () => {
    const item = await repo.insert(
      makeItem({
        title: 'Miles Davis - Kind of Blue',
        price: 24.99,
        media_condition: 'Very Good Plus (VG+)',
        discogs_id: 'r388',
      }),
    )

    // Simulate sync taking a moment
    vi.spyOn(global, 'fetch').mockImplementation(async () => {
      await new Promise((r) => setTimeout(r, 50))
      return new Response(
        JSON.stringify({ listing_id: 999, resource_url: `${LISTINGS_URL}/999` }),
        { status: 201, headers: { 'Content-Type': 'application/json' } },
      )
    })

    // Run sync and bulk price update concurrently
    await Promise.all([
      syncItemToDiscogs(item.id),
      repo.bulkUpdatePrice([item.id], 19.99),
    ])

    const result = await repo.getById(item.id)
    expect(result).not.toBeNull()

    // Price update landed
    expect(Number(result!.price)).toBe(19.99)

    // Sync status also recorded — not silently overwritten
    expect(result!.discogs_sync_status).toBe('listed')
    expect(result!.discogs_listing_id).toBe('999')
    expect(result!.discogs_synced_at).not.toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Test B — two concurrent updates, single winner
// ---------------------------------------------------------------------------
describe('Test B: two concurrent PATCH requests with same version', () => {
  it('one update wins, the other gets count=0 (version mismatch)', async () => {
    const item = await repo.insert(makeItem({ title: 'Original Title' }))
    expect(item.version).toBe(1)

    const [countA, countB] = await Promise.all([
      repo.updateWithVersion(item.id, 1, { title: 'Update from A' }),
      repo.updateWithVersion(item.id, 1, { title: 'Update from B' }),
    ])

    expect(countA + countB).toBe(1)

    const final = await repo.getById(item.id)
    expect(final!.version).toBe(2)
    expect(['Update from A', 'Update from B']).toContain(final!.title)
  })

  it('loser receives a 0 count indicating conflict', async () => {
    const item = await repo.insert(makeItem())

    await repo.updateWithVersion(item.id, 1, { title: 'First writer' })

    const staleCount = await repo.updateWithVersion(item.id, 1, { title: 'Late writer' })
    expect(staleCount).toBe(0)

    const final = await repo.getById(item.id)
    expect(final!.title).toBe('First writer')
    expect(final!.version).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// Test C — external API error mid-sync, then recovery
// ---------------------------------------------------------------------------
describe('Test C: external API error mid-sync and recovery', () => {
  it('sets error state when Discogs call fails', async () => {
    const item = await repo.insert(
      makeItem({
        media_condition: 'Very Good Plus (VG+)',
        discogs_id: 'r388',
      }),
    )

    mockFetchError(401, 'Unauthorized')

    await expect(syncItemToDiscogs(item.id)).rejects.toThrow('Unauthorized')

    const errored = await repo.getById(item.id)
    expect(errored!.discogs_sync_status).toBe('error')
    expect(errored!.discogs_sync_error).toBe('Unauthorized')
    expect(errored!.discogs_listing_id).toBeNull()
  })

  it('recovers to listed state on subsequent successful sync', async () => {
    const item = await repo.insert(
      makeItem({
        media_condition: 'Very Good Plus (VG+)',
        discogs_id: 'r388',
      }),
    )

    // First sync fails
    mockFetchError(503, 'Service Unavailable')
    await expect(syncItemToDiscogs(item.id)).rejects.toThrow()

    const errored = await repo.getById(item.id)
    expect(errored!.discogs_sync_status).toBe('error')

    // Re-sync succeeds
    vi.restoreAllMocks()
    mockFetchSuccess()
    await syncItemToDiscogs(item.id)

    const recovered = await repo.getById(item.id)
    expect(recovered!.discogs_sync_status).toBe('listed')
    expect(recovered!.discogs_listing_id).toBe('999')
    expect(recovered!.discogs_sync_error).toBeNull()
  })
})
