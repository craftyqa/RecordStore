/**
 * Bulk price update tests — selection UI and applying a new price @full
 */
import { test, expect } from '../fixtures'

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
      request.post(`${API}/items`, { data: { title: titleA, price: 10.00, quantity: 1 } }),
      request.post(`${API}/items`, { data: { title: titleB, price: 10.00, quantity: 1 } }),
    ])
    expect(resA.ok()).toBeTruthy()
    expect(resB.ok()).toBeTruthy()
    idA = (await resA.json()).data.id
    idB = (await resB.json()).data.id
  })

  test('selecting a single item reveals the bulk price toolbar', async ({ inventoryPage }) => {
    await inventoryPage.goto()
    await inventoryPage.waitForItem(titleA)
    await inventoryPage.selectRow(titleA)
    await expect(inventoryPage.selectionCount(1)).toBeVisible()
    await expect(inventoryPage.bulkPriceInput).toBeVisible()
    await expect(inventoryPage.applyButton).toBeVisible()
  })

  test('selecting two items shows the correct count', async ({ inventoryPage }) => {
    await inventoryPage.goto()
    await inventoryPage.waitForItem(titleA)
    await inventoryPage.waitForItem(titleB)
    await inventoryPage.selectRow(titleA)
    await inventoryPage.selectRow(titleB)
    await expect(inventoryPage.selectionCount(2)).toBeVisible()
  })

  test('deselecting all items hides the bulk toolbar', async ({ inventoryPage }) => {
    await inventoryPage.goto()
    await inventoryPage.waitForItem(titleA)
    await inventoryPage.selectRow(titleA)
    await expect(inventoryPage.selectionCount(1)).toBeVisible()
    await inventoryPage.deselectRow(titleA)
    await expect(inventoryPage.selectionCount(1)).not.toBeVisible()
  })

  test('the select-all header checkbox selects every visible item', async ({ inventoryPage }) => {
    await inventoryPage.goto()
    await inventoryPage.waitForItem(titleA)
    await inventoryPage.selectAll()
    await expect(inventoryPage.anySelectionCount()).toBeVisible()
    await expect(inventoryPage.rowCheckbox(titleA)).toBeChecked()
    await expect(inventoryPage.rowCheckbox(titleB)).toBeChecked()
  })

  test('entering an invalid price shows an error message', async ({ inventoryPage }) => {
    await inventoryPage.goto()
    await inventoryPage.waitForItem(titleA)
    await inventoryPage.selectRow(titleA)
    await inventoryPage.applyBulkPrice('-5')
    await expect(inventoryPage.bulkPriceError).toBeVisible()
  })

  test('applying a valid price updates rows and hides the toolbar', async ({
    inventoryPage,
    request,
  }) => {
    await inventoryPage.goto()
    await inventoryPage.waitForItem(titleA)
    await inventoryPage.waitForItem(titleB)
    await inventoryPage.selectRow(titleA)
    await inventoryPage.selectRow(titleB)
    await inventoryPage.applyBulkPrice('29.99')

    // Toolbar disappears after a successful save
    await expect(inventoryPage.selectionCount(2)).not.toBeVisible()

    // Updated prices appear in the refreshed list
    await expect(inventoryPage.rowPrice(titleA, '$29.99')).toBeVisible()
    await expect(inventoryPage.rowPrice(titleB, '$29.99')).toBeVisible()

    // Confirm the DB values changed via API
    const [bodyA, bodyB] = await Promise.all([
      request.get(`${API}/items/${idA}`).then((r) => r.json()),
      request.get(`${API}/items/${idB}`).then((r) => r.json()),
    ])
    expect(Number(bodyA.data.price)).toBe(29.99)
    expect(Number(bodyB.data.price)).toBe(29.99)
  })
})
