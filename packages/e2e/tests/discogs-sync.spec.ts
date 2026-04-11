/**
 * Discogs sync panel tests — button state, status display, and lifecycle @full
 *
 * Sync attempts that reach Discogs will fail without a live token (dev / CI),
 * so tests assert the resulting error state rather than a successful listing.
 */
import { test, expect } from '../fixtures'

const API = 'http://localhost:3001'

test.describe('Discogs sync panel @full', () => {
  test('sync button is disabled when the item has no Discogs ID', async ({
    detailPage,
    request,
  }) => {
    const res = await request.post(`${API}/items`, {
      data: { title: `Sync-${Date.now()} No ID`, price: 9.99, quantity: 1 },
    })
    await detailPage.goto((await res.json()).data.id)
    await expect(detailPage.discogs.syncButton).toBeVisible()
    await expect(detailPage.discogs.syncButton).toBeDisabled()
  })

  test('sync button is enabled when the item has a Discogs ID', async ({
    detailPage,
    request,
  }) => {
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
    await detailPage.goto((await res.json()).data.id)
    await expect(detailPage.discogs.syncButton).toBeVisible()
    await expect(detailPage.discogs.syncButton).toBeEnabled()
  })

  test('a brand-new item shows "Not synced" status', async ({ detailPage, request }) => {
    const res = await request.post(`${API}/items`, {
      data: { title: `Sync-${Date.now()} Never`, price: 8.00, quantity: 1 },
    })
    await detailPage.goto((await res.json()).data.id)
    await expect(detailPage.discogs.notSynced).toBeVisible()
  })

  test('an item in error state shows the Sync error badge', async ({ detailPage, request }) => {
    const ts = Date.now()
    const { data: item } = await request
      .post(`${API}/items`, {
        data: {
          title: `Sync-${ts} Error State`,
          price: 18.00,
          quantity: 1,
          discogs_id: `r${ts}`,
          media_condition: 'Very Good Plus (VG+)',
          sleeve_condition: 'Very Good (VG)',
        },
      })
      .then((r) => r.json())

    // Trigger a sync — without a live token this sets discogs_sync_status='error'
    await request.post(`${API}/items/${item.id}/sync/discogs`)

    const { data: refreshed } = await request
      .get(`${API}/items/${item.id}`)
      .then((r) => r.json())

    await detailPage.goto(item.id)

    if (refreshed.discogs_sync_status === 'listed') {
      await expect(detailPage.discogs.listedOnDiscogs).toBeVisible()
    } else {
      await expect(detailPage.discogs.syncError).toBeVisible()
    }
  })

  test('clicking Sync shows Syncing… then resolves to a terminal status', async ({
    detailPage,
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
    await detailPage.goto((await res.json()).data.id)

    await detailPage.discogs.clickSync()
    await expect(detailPage.discogs.syncingButton).toBeVisible()

    // Allow up to 15 s for the retry back-off to complete
    await expect(detailPage.discogs.syncingButton).not.toBeVisible({ timeout: 15_000 })
    await expect(detailPage.discogs.terminalStatus()).toBeVisible()
  })
})
