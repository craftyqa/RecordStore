/**
 * Discogs sync panel tests — button state, status display, and error
 * handling visible in the UI @full
 *
 * These tests exercise the UI only — they do not assert that a real Discogs
 * listing was created. Sync attempts that reach Discogs will fail in CI
 * (no live token) and we assert the resulting error state is surfaced.
 *
 * discogs_id values include a per-test timestamp to satisfy the unique
 * constraint and avoid conflicts across beforeEach invocations.
 */
import { test, expect } from '@playwright/test'

const API = 'http://localhost:3001'

test.describe('Discogs sync panel @full', () => {
  test('sync button is disabled when the item has no Discogs ID', async ({ page, request }) => {
    const res = await request.post(`${API}/items`, {
      data: { title: `Sync-${Date.now()} No ID`, price: 9.99, quantity: 1 },
    })
    const { data } = await res.json()

    await page.goto(`/items/${data.id}`)
    const syncBtn = page.getByRole('button', { name: /sync to discogs/i })
    await expect(syncBtn).toBeVisible()
    await expect(syncBtn).toBeDisabled()
  })

  test('sync button is enabled when the item has a Discogs ID', async ({ page, request }) => {
    const ts = Date.now()
    const res = await request.post(`${API}/items`, {
      data: {
        title: `Sync-${ts} Has ID`,
        price: 12.99,
        quantity: 1,
        discogs_id: `r${ts}`,
        media_condition: 'Very Good Plus (VG+)',
      },
    })
    const { data } = await res.json()

    await page.goto(`/items/${data.id}`)
    const syncBtn = page.getByRole('button', { name: /sync to discogs/i })
    await expect(syncBtn).toBeVisible()
    await expect(syncBtn).toBeEnabled()
  })

  test('a brand-new item shows "Not synced" status', async ({ page, request }) => {
    const res = await request.post(`${API}/items`, {
      data: { title: `Sync-${Date.now()} Never`, price: 8.00, quantity: 1 },
    })
    const { data } = await res.json()

    await page.goto(`/items/${data.id}`)
    await expect(page.getByText('Not synced')).toBeVisible()
  })

  test('an item in error state shows the Sync error badge', async ({ page, request }) => {
    const ts = Date.now()
    const createRes = await request.post(`${API}/items`, {
      data: {
        title: `Sync-${ts} Error State`,
        price: 18.00,
        quantity: 1,
        discogs_id: `r${ts}`,
        media_condition: 'Very Good Plus (VG+)',
        sleeve_condition: 'Very Good (VG)',
      },
    })
    const { data: item } = await createRes.json()

    // Trigger a sync — without a valid token this will error and set the item
    // into the error state, which is what we want to verify in the UI.
    await request.post(`${API}/items/${item.id}/sync/discogs`)

    // Confirm the sync status was persisted as error or listed
    const detail = await request.get(`${API}/items/${item.id}`).then((r) => r.json())
    const status = detail.data.discogs_sync_status

    await page.goto(`/items/${item.id}`)

    if (status === 'listed') {
      await expect(page.getByText('Listed on Discogs')).toBeVisible()
    } else {
      // No live token in dev/CI — we expect the error badge
      await expect(page.getByText('Sync error')).toBeVisible()
    }
  })

  test('clicking Sync shows Syncing... then resolves to a terminal status', async ({
    page,
    request,
  }) => {
    const ts = Date.now()
    const res = await request.post(`${API}/items`, {
      data: {
        title: `Sync-${ts} Click Test`,
        price: 14.99,
        quantity: 1,
        discogs_id: `r${ts + 1}`,
        media_condition: 'Very Good Plus (VG+)',
        sleeve_condition: 'Very Good (VG)',
      },
    })
    const { data } = await res.json()

    await page.goto(`/items/${data.id}`)
    await page.getByRole('button', { name: /sync to discogs/i }).click()

    // Button should immediately show loading state
    await expect(page.getByRole('button', { name: /syncing/i })).toBeVisible()

    // After sync completes (max 15 s for retry back-off) the loading state clears
    await expect(page.getByRole('button', { name: /syncing/i })).not.toBeVisible({
      timeout: 15_000,
    })

    // Either success or error badge must be displayed — not "Not synced"
    const listed = page.getByText('Listed on Discogs')
    const errored = page.getByText('Sync error')
    await expect(listed.or(errored)).toBeVisible()
  })
})
