/**
 * Create item tests — form validation and successful creation @full
 */
import { test, expect } from '../fixtures'

// Module-level RUN gives each suffix (Rumours, Thriller, Nevermind) a unique
// title across runs while keeping the tests within this file collision-free.
const RUN = Date.now()

test.describe('Create item @full', () => {
  test('+ Add Item button navigates to the create form', async ({ inventoryPage, createPage, page }) => {
    await inventoryPage.goto()
    await inventoryPage.clickAddItem()
    await expect(page).toHaveURL('/items/new')
    await expect(createPage.heading).toBeVisible()
  })

  test('← Back to inventory returns without creating', async ({ createPage, inventoryPage, page }) => {
    await createPage.goto()
    await createPage.clickBackToInventory()
    await expect(page).toHaveURL(/\/items(\?.*)?$/)
    await expect(inventoryPage.heading).toBeVisible()
  })

  test('shows Title is required when title is blank', async ({ createPage }) => {
    await createPage.goto()
    await createPage.fill({ price: '9.99' })
    await createPage.submit()
    await expect(createPage.form.titleError).toBeVisible()
  })

  test('shows price validation error when price is zero', async ({ createPage }) => {
    await createPage.goto()
    await createPage.fill({ title: 'Test', price: '0' })
    await createPage.submit()
    await expect(createPage.form.priceError).toBeVisible()
  })

  test('shows both errors when title and price are missing', async ({ createPage }) => {
    await createPage.goto()
    await createPage.submit()
    await expect(createPage.form.titleError).toBeVisible()
    await expect(createPage.form.priceError).toBeVisible()
  })

  test('successful create redirects to the new item detail page', async ({
    createPage,
    detailPage,
    page,
  }) => {
    const title = `Create-${RUN} Rumours`
    await createPage.goto()
    await createPage.fillAndSubmit({
      title,
      price: '19.99',
      quantity: '2',
      media_condition: 'Very Good Plus (VG+)',
      sleeve_condition: 'Very Good (VG)',
    })
    await expect(page).toHaveURL(/\/items\/[0-9a-f-]{36}$/)
    await expect(detailPage.heading(title)).toBeVisible()
  })

  test('created item shows the submitted field values on the detail page', async ({
    createPage,
    detailPage,
  }) => {
    const title = `Create-${RUN} Thriller`
    await createPage.goto()
    await createPage.fillAndSubmit({
      title,
      price: '14.99',
      quantity: '5',
      media_condition: 'Near Mint (NM or M-)',
      comments: 'Still sealed',
    })
    await expect(detailPage.heading(title)).toBeVisible()
    await expect(detailPage.field('$14.99')).toBeVisible()
    await expect(detailPage.field('Near Mint (NM or M-)')).toBeVisible()
    await expect(detailPage.field('Still sealed')).toBeVisible()
  })

  test('created item appears in the inventory list', async ({ createPage, inventoryPage, page }) => {
    const title = `Create-${RUN} Nevermind`
    await createPage.goto()
    await createPage.fillAndSubmit({ title, price: '22.00' })
    await expect(page).toHaveURL(/\/items\/[0-9a-f-]{36}$/)
    await inventoryPage.goto()
    await expect(inventoryPage.titleCell(title)).toBeVisible()
  })
})
