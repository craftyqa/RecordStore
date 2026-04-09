/**
 * Bulk price update tests — selection UI and applying a new price @full
 *
 * Creates two items per test via the API in beforeEach. Timestamps are
 * generated inside beforeEach so that each test gets uniquely named items,
 * preventing strict-mode violations from duplicate row titles.
 */
import { test, expect } from '@playwright/test'

const API = 'http://localhost:3001'

test.describe('Bulk price update @full', () => {
  let idA: string
  let idB: string
  let titleA: string
  let titleB: string

  test.beforeEach(async ({ request }) => {
    const ts = Date.now()
    titleA = `Bulk-${ts} Record A`
    titleB = `Bulk-${ts} Record B`

    const [resA, resB] = await Promise.all([
      request.post(`${API}/items`, {
        data: { title: titleA, price: 10.00, quantity: 1 },
      }),
      request.post(`${API}/items`, {
        data: { title: titleB, price: 10.00, quantity: 1 },
      }),
    ])
    expect(resA.ok()).toBeTruthy()
    expect(resB.ok()).toBeTruthy()
    idA = (await resA.json()).data.id
    idB = (await resB.json()).data.id
  })

  test('selecting a single item reveals the bulk price toolbar', async ({ page }) => {
    await page.goto('/items')
    await expect(page.getByRole('cell', { name: titleA }).first()).toBeVisible()

    const rowA = page.getByRole('row').filter({ hasText: titleA }).first()
    await rowA.getByRole('checkbox').check()

    await expect(page.getByText('1 selected')).toBeVisible()
    await expect(page.getByPlaceholder('0.00')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Apply' })).toBeVisible()
  })

  test('selecting two items shows the correct count', async ({ page }) => {
    await page.goto('/items')
    await expect(page.getByRole('cell', { name: titleA }).first()).toBeVisible()
    await expect(page.getByRole('cell', { name: titleB }).first()).toBeVisible()

    await page.getByRole('row').filter({ hasText: titleA }).first().getByRole('checkbox').check()
    await page.getByRole('row').filter({ hasText: titleB }).first().getByRole('checkbox').check()

    await expect(page.getByText('2 selected')).toBeVisible()
  })

  test('deselecting all items hides the bulk toolbar', async ({ page }) => {
    await page.goto('/items')
    await expect(page.getByRole('cell', { name: titleA }).first()).toBeVisible()

    const rowA = page.getByRole('row').filter({ hasText: titleA }).first()
    const checkbox = rowA.getByRole('checkbox')
    await checkbox.check()
    await expect(page.getByText('1 selected')).toBeVisible()

    await checkbox.uncheck()
    await expect(page.getByText('1 selected')).not.toBeVisible()
  })

  test('the select-all header checkbox selects every visible item', async ({ page }) => {
    await page.goto('/items')
    await expect(page.getByRole('cell', { name: titleA }).first()).toBeVisible()

    const headerCheckbox = page.getByRole('columnheader').getByRole('checkbox')
    await headerCheckbox.check()

    // Bulk toolbar appears with at least 1 item selected
    await expect(page.getByText(/\d+ selected/)).toBeVisible()
    // Our test rows should now be checked
    await expect(
      page.getByRole('row').filter({ hasText: titleA }).first().getByRole('checkbox'),
    ).toBeChecked()
    await expect(
      page.getByRole('row').filter({ hasText: titleB }).first().getByRole('checkbox'),
    ).toBeChecked()
  })

  test('entering an invalid price shows an error message', async ({ page }) => {
    await page.goto('/items')
    await expect(page.getByRole('cell', { name: titleA }).first()).toBeVisible()

    await page.getByRole('row').filter({ hasText: titleA }).first().getByRole('checkbox').check()
    await page.getByPlaceholder('0.00').fill('-5')
    await page.getByRole('button', { name: 'Apply' }).click()

    await expect(page.getByText('Enter a valid price')).toBeVisible()
  })

  test('applying a valid price updates rows and hides the toolbar', async ({ page, request }) => {
    await page.goto('/items')
    await expect(page.getByRole('cell', { name: titleA }).first()).toBeVisible()
    await expect(page.getByRole('cell', { name: titleB }).first()).toBeVisible()

    await page.getByRole('row').filter({ hasText: titleA }).first().getByRole('checkbox').check()
    await page.getByRole('row').filter({ hasText: titleB }).first().getByRole('checkbox').check()
    await expect(page.getByText('2 selected')).toBeVisible()

    await page.getByPlaceholder('0.00').fill('29.99')
    await page.getByRole('button', { name: 'Apply' }).click()

    // Toolbar disappears after a successful save
    await expect(page.getByText('2 selected')).not.toBeVisible()

    // Price updated in the refreshed list
    await expect(
      page.getByRole('row').filter({ hasText: titleA }).first().getByText('$29.99'),
    ).toBeVisible()
    await expect(
      page.getByRole('row').filter({ hasText: titleB }).first().getByText('$29.99'),
    ).toBeVisible()

    // Confirm via API that the DB values changed
    const [bodyA, bodyB] = await Promise.all([
      request.get(`${API}/items/${idA}`).then((r) => r.json()),
      request.get(`${API}/items/${idB}`).then((r) => r.json()),
    ])
    expect(Number(bodyA.data.price)).toBe(29.99)
    expect(Number(bodyB.data.price)).toBe(29.99)
  })
})
