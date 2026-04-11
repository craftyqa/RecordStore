/**
 * Items browse tests — inventory list and detail page @full
 */
import { test, expect } from '../fixtures'

const API = 'http://localhost:3001'

test.describe('Inventory list @full', () => {
  let itemId: string
  let title: string

  test.beforeEach(async ({ request }) => {
    title = `Browse-${Date.now()} Kind of Blue`
    const res = await request.post(`${API}/items`, {
      data: {
        title,
        price: 12.99,
        quantity: 3,
        media_condition: 'Very Good Plus (VG+)',
        sleeve_condition: 'Very Good (VG)',
        comments: 'Original pressing',
      },
    })
    expect(res.ok()).toBeTruthy()
    itemId = (await res.json()).data.id
  })

  test('shows heading and table column headers', async ({ inventoryPage }) => {
    await inventoryPage.goto()
    await expect(inventoryPage.heading).toBeVisible()
    await expect(inventoryPage.columnHeader('Title')).toBeVisible()
    await expect(inventoryPage.columnHeader('Media')).toBeVisible()
    await expect(inventoryPage.columnHeader('Sleeve')).toBeVisible()
    await expect(inventoryPage.columnHeader('Price')).toBeVisible()
    await expect(inventoryPage.columnHeader('Qty')).toBeVisible()
  })

  test('lists the test item in the table', async ({ inventoryPage }) => {
    await inventoryPage.goto()
    await expect(inventoryPage.titleCell(title)).toBeVisible()
  })

  test('clicking the title cell navigates to the detail page', async ({ inventoryPage, page }) => {
    await inventoryPage.goto()
    await inventoryPage.clickItem(title)
    await expect(page).toHaveURL(`/items/${itemId}`)
  })

  test('shows page 1 and Previous button disabled on load', async ({ inventoryPage }) => {
    await inventoryPage.goto()
    await expect(inventoryPage.pageIndicator()).toBeVisible()
    await expect(inventoryPage.previousButton).toBeDisabled()
  })

  test('Add Item button is present on the list page', async ({ inventoryPage }) => {
    await inventoryPage.goto()
    await expect(inventoryPage.addItemButton).toBeVisible()
  })
})

test.describe('Item detail page @full', () => {
  let itemId: string
  let title: string
  let discogsId: string

  test.beforeEach(async ({ request }) => {
    // Per-test timestamp keeps discogs_id unique across every beforeEach call.
    const ts = Date.now()
    title = `Detail-${ts} Blue Train`
    discogsId = `r${ts}`

    const res = await request.post(`${API}/items`, {
      data: {
        title,
        price: 24.99,
        quantity: 1,
        media_condition: 'Near Mint (NM or M-)',
        sleeve_condition: 'Very Good Plus (VG+)',
        comments: 'Blue Note original',
        discogs_id: discogsId,
      },
    })
    expect(res.ok()).toBeTruthy()
    itemId = (await res.json()).data.id
  })

  test('shows the item title as a heading', async ({ detailPage }) => {
    await detailPage.goto(itemId)
    await expect(detailPage.heading(title)).toBeVisible()
  })

  test('shows price, quantity, and condition fields', async ({ detailPage }) => {
    await detailPage.goto(itemId)
    await expect(detailPage.field('$24.99')).toBeVisible()
    await expect(detailPage.field('Near Mint (NM or M-)')).toBeVisible()
    await expect(detailPage.field('Very Good Plus (VG+)')).toBeVisible()
  })

  test('shows comments when present', async ({ detailPage }) => {
    await detailPage.goto(itemId)
    await expect(detailPage.field('Blue Note original')).toBeVisible()
  })

  test('shows Discogs Release ID when set', async ({ detailPage }) => {
    await detailPage.goto(itemId)
    await expect(detailPage.field(discogsId)).toBeVisible()
  })

  test('Edit button is visible on the detail page', async ({ detailPage }) => {
    await detailPage.goto(itemId)
    await expect(detailPage.editButton).toBeVisible()
  })

  test('← Back to inventory returns to the list', async ({ detailPage, inventoryPage, page }) => {
    await detailPage.goto(itemId)
    await detailPage.clickBackToInventory()
    await expect(page).toHaveURL(/\/items(\?.*)?$/)
    await expect(inventoryPage.heading).toBeVisible()
  })

  test('shows an error for an unknown item id', async ({ detailPage }) => {
    await detailPage.goto('00000000-0000-0000-0000-000000000000')
    await expect(detailPage.notFoundError()).toBeVisible()
  })
})
