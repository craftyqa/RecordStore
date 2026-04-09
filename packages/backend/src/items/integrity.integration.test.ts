import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import * as repo from './repository'
import { syncItemToDiscogs } from '../discogs/sync'
import { makeItem } from '../test/factory'

process.env.DISCOGS_TOKEN = 'test-token'

const LISTINGS_URL = 'https://api.discogs.com/marketplace/listings'

// Default stub: Discogs create listing succeeds immediately
const server = setupServer(
  http.post(LISTINGS_URL, () =>
    HttpResponse.json({ listing_id: 999, resource_url: `${LISTINGS_URL}/999` }, { status: 201 }),
  ),
  http.post(`${LISTINGS_URL}/:listingId`, () => new HttpResponse(null, { status: 204 })),
)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

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

    // Simulate sync taking a moment by delaying the Discogs response
    server.use(
      http.post(LISTINGS_URL, async () => {
        await new Promise((r) => setTimeout(r, 50))
        return HttpResponse.json(
          { listing_id: 999, resource_url: `${LISTINGS_URL}/999` },
          { status: 201 },
        )
      }),
    )

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

    // Both requests read version=1 at the same time and try to update
    const [countA, countB] = await Promise.all([
      repo.updateWithVersion(item.id, 1, { title: 'Update from A' }),
      repo.updateWithVersion(item.id, 1, { title: 'Update from B' }),
    ])

    // Exactly one should win
    expect(countA + countB).toBe(1)

    const final = await repo.getById(item.id)
    // Winner's version incremented
    expect(final!.version).toBe(2)
    // Title is one of the two updates (DB decides the winner)
    expect(['Update from A', 'Update from B']).toContain(final!.title)
  })

  it('loser receives a 0 count indicating conflict', async () => {
    const item = await repo.insert(makeItem())

    // First update wins and bumps version to 2
    await repo.updateWithVersion(item.id, 1, { title: 'First writer' })

    // Second attempt with stale version=1
    const staleCount = await repo.updateWithVersion(item.id, 1, { title: 'Late writer' })
    expect(staleCount).toBe(0)

    // DB still reflects the first writer
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

    // Discogs returns a terminal error
    server.use(
      http.post(LISTINGS_URL, () =>
        HttpResponse.json({ message: 'Unauthorized' }, { status: 401 }),
      ),
    )

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
    server.use(
      http.post(LISTINGS_URL, () =>
        HttpResponse.json({ message: 'Service Unavailable' }, { status: 503 }),
      ),
    )
    await expect(syncItemToDiscogs(item.id)).rejects.toThrow()

    const errored = await repo.getById(item.id)
    expect(errored!.discogs_sync_status).toBe('error')

    // Reset to success handler and re-sync
    server.resetHandlers()
    await syncItemToDiscogs(item.id)

    const recovered = await repo.getById(item.id)
    expect(recovered!.discogs_sync_status).toBe('listed')
    expect(recovered!.discogs_listing_id).toBe('999')
    expect(recovered!.discogs_sync_error).toBeNull()
  })
})
