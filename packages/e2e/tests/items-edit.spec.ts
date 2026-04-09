/**
 * Edit item tests — pre-population, saving, and conflict handling @full
 *
 * Each test creates a fresh item via the API in beforeEach. Timestamps are
 * generated inside beforeEach (not at module scope) so that each test gets
 * a uniquely named item, avoiding strict-mode violations.
 */
import { test, expect } from '@playwright/test'

const API = 'http://localhost:3001'

test.describe('Edit item @full', () => {
  let itemId: string
  let originalTitle: string

  test.beforeEach(async ({ request }) => {
    originalTitle = `Edit-${Date.now()} Original Title`
    const res = await request.post(`${API}/items`, {
      data: {
        title: originalTitle,
        price: 15.00,
        quantity: 2,
        media_condition: 'Very Good (VG)',
        sleeve_condition: 'Good Plus (G+)',
        comments: 'Minor scuffs',
      },
    })
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    itemId = body.data.id
  })

  test('Edit button on detail page navigates to the edit form', async ({ page }) => {
    await page.goto(`/items/${itemId}`)
    await page.getByRole('button', { name: 'Edit' }).click()
    await expect(page).toHaveURL(`/items/${itemId}/edit`)
    await expect(page.getByRole('heading', { name: 'Edit Item' })).toBeVisible()
  })

  test('edit form is pre-populated with the existing item values', async ({ page }) => {
    await page.goto(`/items/${itemId}/edit`)
    await expect(page.getByLabel('Title *')).toHaveValue(originalTitle)
    await expect(page.getByLabel('Price *')).toHaveValue('15')
    await expect(page.getByLabel('Quantity')).toHaveValue('2')
    await expect(page.getByLabel('Media Condition')).toHaveValue('Very Good (VG)')
    await expect(page.getByLabel('Sleeve Condition')).toHaveValue('Good Plus (G+)')
    await expect(page.getByLabel('Comments')).toHaveValue('Minor scuffs')
  })

  test('saving changes updates the item and redirects to the detail page', async ({ page }) => {
    const updatedTitle = `Edit-${Date.now()} Updated Title`
    await page.goto(`/items/${itemId}/edit`)
    await page.getByLabel('Title *').fill(updatedTitle)
    await page.getByLabel('Price *').fill('28.50')
    await page.getByLabel('Media Condition').selectOption('Near Mint (NM or M-)')
    await page.getByRole('button', { name: 'Save Changes' }).click()

    await expect(page).toHaveURL(`/items/${itemId}`)
    await expect(page.getByRole('heading', { name: updatedTitle })).toBeVisible()
    await expect(page.getByText('$28.50')).toBeVisible()
    await expect(page.getByText('Near Mint (NM or M-)')).toBeVisible()
  })

  test('← Back to item returns to the detail page without saving', async ({ page }) => {
    await page.goto(`/items/${itemId}/edit`)
    // Dirty the form — should not be saved
    await page.getByLabel('Title *').fill('Should not be saved')
    await page.getByText('← Back to item').click()
    await expect(page).toHaveURL(`/items/${itemId}`)
    // Original title is still shown
    await expect(page.getByRole('heading', { name: originalTitle })).toBeVisible()
  })

  test('shows a conflict error when the item was modified externally after page load', async ({
    page,
    request,
  }) => {
    await page.goto(`/items/${itemId}/edit`)
    // Wait for the form to finish loading with version=1 before triggering the race.
    // Without this, the concurrent PATCH could complete before the page fetch, causing
    // the form to initialise with version=2 and submit without a conflict.
    await expect(page.getByLabel('Title *')).toHaveValue(originalTitle)

    // Simulate a concurrent update by another actor — increments the version
    const patchRes = await request.patch(`${API}/items/${itemId}`, {
      data: { title: `${originalTitle} — race winner`, price: 15.00, quantity: 2, version: 1 },
    })
    expect(patchRes.ok()).toBeTruthy()

    // Submit the stale edit form — it still holds version 1 from page load
    await page.getByLabel('Title *').fill('Stale edit attempt')
    await page.getByRole('button', { name: 'Save Changes' }).click()

    // The 409 response should surface as a user-visible conflict message
    await expect(
      page.getByText('This item was modified by someone else', { exact: false }),
    ).toBeVisible()
  })
})
