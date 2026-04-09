/**
 * Items browse tests — inventory list and detail page @full
 *
 * Each test creates its own item via the API immediately before it runs
 * (inside beforeEach) so every invocation gets a fresh, uniquely titled
 * record. Using Date.now() inside beforeEach — rather than at module
 * scope — prevents strict-mode violations when the same describe block
 * runs multiple tests that each create an item.
 */
import { test, expect } from '@playwright/test'

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
    const body = await res.json()
    itemId = body.data.id
  })

  test('shows heading and table column headers', async ({ page }) => {
    await page.goto('/items')
    await expect(page.getByRole('heading', { name: 'Inventory' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Title' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Media' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Sleeve' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Price' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Qty' })).toBeVisible()
  })

  test('lists the test item in the table', async ({ page }) => {
    await page.goto('/items')
    await expect(page.getByRole('cell', { name: title }).first()).toBeVisible()
  })

  test('clicking the title cell navigates to the detail page', async ({ page }) => {
    await page.goto('/items')
    await page.getByRole('cell', { name: title }).first().click()
    await expect(page).toHaveURL(`/items/${itemId}`)
  })

  test('shows page 1 and Previous button disabled on load', async ({ page }) => {
    await page.goto('/items')
    await expect(page.getByText('Page 1')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Previous' })).toBeDisabled()
  })

  test('Add Item button is present on the list page', async ({ page }) => {
    await page.goto('/items')
    await expect(page.getByRole('button', { name: '+ Add Item' })).toBeVisible()
  })
})

test.describe('Item detail page @full', () => {
  let itemId: string
  let title: string
  let discogsId: string

  test.beforeEach(async ({ request }) => {
    // Use per-test timestamp so discogs_id is unique across every beforeEach call
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
    const body = await res.json()
    itemId = body.data.id
  })

  test('shows the item title as a heading', async ({ page }) => {
    await page.goto(`/items/${itemId}`)
    await expect(page.getByRole('heading', { name: title })).toBeVisible()
  })

  test('shows price, quantity, and condition fields', async ({ page }) => {
    await page.goto(`/items/${itemId}`)
    await expect(page.getByText('$24.99')).toBeVisible()
    await expect(page.getByText('Near Mint (NM or M-)')).toBeVisible()
    await expect(page.getByText('Very Good Plus (VG+)')).toBeVisible()
  })

  test('shows comments when present', async ({ page }) => {
    await page.goto(`/items/${itemId}`)
    await expect(page.getByText('Blue Note original')).toBeVisible()
  })

  test('shows Discogs Release ID when set', async ({ page }) => {
    await page.goto(`/items/${itemId}`)
    await expect(page.getByText(discogsId)).toBeVisible()
  })

  test('Edit button is visible on the detail page', async ({ page }) => {
    await page.goto(`/items/${itemId}`)
    await expect(page.getByRole('button', { name: 'Edit' })).toBeVisible()
  })

  test('← Back to inventory returns to the list', async ({ page }) => {
    await page.goto(`/items/${itemId}`)
    await page.getByText('← Back to inventory').click()
    await expect(page).toHaveURL(/\/items(\?.*)?$/)
    await expect(page.getByRole('heading', { name: 'Inventory' })).toBeVisible()
  })

  test('shows an error for an unknown item id', async ({ page }) => {
    await page.goto('/items/00000000-0000-0000-0000-000000000000')
    await expect(page.getByText('Item not found')).toBeVisible()
  })
})
