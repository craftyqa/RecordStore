/**
 * Edit item tests — pre-population, saving, and conflict handling @full
 */
import { test, expect } from '../fixtures'

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
    itemId = (await res.json()).data.id
  })

  test('Edit button on detail page navigates to the edit form', async ({
    detailPage,
    editPage,
    page,
  }) => {
    await detailPage.goto(itemId)
    await detailPage.clickEdit()
    await expect(page).toHaveURL(`/items/${itemId}/edit`)
    await expect(editPage.heading).toBeVisible()
  })

  test('edit form is pre-populated with the existing item values', async ({ editPage }) => {
    await editPage.goto(itemId)
    await expect(editPage.form.titleInput).toHaveValue(originalTitle)
    await expect(editPage.form.priceInput).toHaveValue('15')
    await expect(editPage.form.quantityInput).toHaveValue('2')
    await expect(editPage.form.mediaConditionSelect).toHaveValue('Very Good (VG)')
    await expect(editPage.form.sleeveConditionSelect).toHaveValue('Good Plus (G+)')
    await expect(editPage.form.commentsInput).toHaveValue('Minor scuffs')
  })

  test('saving changes updates the item and redirects to the detail page', async ({
    editPage,
    detailPage,
    page,
  }) => {
    const updatedTitle = `Edit-${Date.now()} Updated Title`
    await editPage.goto(itemId)
    await editPage.fillAndSubmit({
      title: updatedTitle,
      price: '28.50',
      media_condition: 'Near Mint (NM or M-)',
    })
    await expect(page).toHaveURL(`/items/${itemId}`)
    await expect(detailPage.heading(updatedTitle)).toBeVisible()
    await expect(detailPage.field('$28.50')).toBeVisible()
    await expect(detailPage.field('Near Mint (NM or M-)')).toBeVisible()
  })

  test('← Back to item returns to the detail page without saving', async ({
    editPage,
    detailPage,
    page,
  }) => {
    await editPage.goto(itemId)
    await editPage.fill({ title: 'Should not be saved' })
    await editPage.clickBackToItem()
    await expect(page).toHaveURL(`/items/${itemId}`)
    await expect(detailPage.heading(originalTitle)).toBeVisible()
  })

  test('shows a conflict error when the item was modified externally after page load', async ({
    editPage,
    request,
  }) => {
    await editPage.goto(itemId)
    // Wait for the form to finish loading with version=1 before triggering the race.
    // Without this, the concurrent PATCH could complete before the page fetch, causing
    // the form to initialise with version=2 and submit without a conflict.
    await expect(editPage.form.titleInput).toHaveValue(originalTitle)

    // Simulate a concurrent update by another actor — increments the version
    const patchRes = await request.patch(`${API}/items/${itemId}`, {
      data: { title: `${originalTitle} — race winner`, price: 15.00, quantity: 2, version: 1 },
    })
    expect(patchRes.ok()).toBeTruthy()

    // Submit the stale edit form — it still holds version 1 from page load
    await editPage.fill({ title: 'Stale edit attempt' })
    await editPage.submit()

    await expect(editPage.conflictError).toBeVisible()
  })
})
