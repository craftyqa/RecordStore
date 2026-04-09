/**
 * Create item tests — form validation and successful creation @full
 *
 * Tests navigate through the UI to verify the create flow end-to-end.
 * Created items are permanent (no delete endpoint) so titles include a
 * run-unique timestamp to avoid cross-run pollution.
 */
import { test, expect } from '@playwright/test'

const RUN = Date.now()

test.describe('Create item @full', () => {
  test('+ Add Item button navigates to the create form', async ({ page }) => {
    await page.goto('/items')
    await page.getByRole('button', { name: '+ Add Item' }).click()
    await expect(page).toHaveURL('/items/new')
    await expect(page.getByRole('heading', { name: 'Add Item' })).toBeVisible()
  })

  test('← Back to inventory returns without creating', async ({ page }) => {
    await page.goto('/items/new')
    await page.getByText('← Back to inventory').click()
    await expect(page).toHaveURL(/\/items(\?.*)?$/)
    await expect(page.getByRole('heading', { name: 'Inventory' })).toBeVisible()
  })

  test('shows Title is required when title is blank', async ({ page }) => {
    await page.goto('/items/new')
    // Leave title empty, set a valid price so only title errors
    await page.getByLabel('Price *').fill('9.99')
    await page.getByRole('button', { name: 'Add Item' }).click()
    await expect(page.getByText('Title is required')).toBeVisible()
  })

  test('shows price validation error when price is zero', async ({ page }) => {
    await page.goto('/items/new')
    await page.getByLabel('Title *').fill('Test')
    await page.getByLabel('Price *').fill('0')
    await page.getByRole('button', { name: 'Add Item' }).click()
    await expect(page.getByText('Price must be positive')).toBeVisible()
  })

  test('shows both errors when title and price are missing', async ({ page }) => {
    await page.goto('/items/new')
    await page.getByRole('button', { name: 'Add Item' }).click()
    await expect(page.getByText('Title is required')).toBeVisible()
    await expect(page.getByText('Price must be positive')).toBeVisible()
  })

  test('successful create redirects to the new item detail page', async ({ page }) => {
    const title = `Create-${RUN} Rumours`
    await page.goto('/items/new')
    await page.getByLabel('Title *').fill(title)
    await page.getByLabel('Price *').fill('19.99')
    await page.getByLabel('Quantity').fill('2')
    await page.getByLabel('Media Condition').selectOption('Very Good Plus (VG+)')
    await page.getByLabel('Sleeve Condition').selectOption('Very Good (VG)')
    await page.getByRole('button', { name: 'Add Item' }).click()

    await expect(page).toHaveURL(/\/items\/[0-9a-f-]{36}$/)
    await expect(page.getByRole('heading', { name: title })).toBeVisible()
  })

  test('created item shows the submitted field values on the detail page', async ({ page }) => {
    const title = `Create-${RUN} Thriller`
    await page.goto('/items/new')
    await page.getByLabel('Title *').fill(title)
    await page.getByLabel('Price *').fill('14.99')
    await page.getByLabel('Quantity').fill('5')
    await page.getByLabel('Media Condition').selectOption('Near Mint (NM or M-)')
    await page.getByLabel('Comments').fill('Still sealed')
    await page.getByRole('button', { name: 'Add Item' }).click()

    await expect(page.getByRole('heading', { name: title })).toBeVisible()
    await expect(page.getByText('$14.99')).toBeVisible()
    await expect(page.getByText('Near Mint (NM or M-)')).toBeVisible()
    await expect(page.getByText('Still sealed')).toBeVisible()
  })

  test('created item appears in the inventory list', async ({ page }) => {
    const title = `Create-${RUN} Nevermind`
    await page.goto('/items/new')
    await page.getByLabel('Title *').fill(title)
    await page.getByLabel('Price *').fill('22.00')
    await page.getByRole('button', { name: 'Add Item' }).click()

    // Redirected to detail — now go back to list
    await expect(page).toHaveURL(/\/items\/[0-9a-f-]{36}$/)
    await page.goto('/items')
    await expect(page.getByRole('cell', { name: title })).toBeVisible()
  })
})
