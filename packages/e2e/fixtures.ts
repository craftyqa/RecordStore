/**
 * Custom Playwright fixture that injects page-object instances alongside the
 * standard `page` and `request` fixtures.
 *
 * All spec files import `{ test, expect }` from here instead of from
 * `@playwright/test` directly so they get the typed POM fixtures for free.
 *
 * Usage in a spec:
 *   import { test, expect } from '../fixtures'
 *
 *   test('example', async ({ inventoryPage }) => {
 *     await inventoryPage.goto()
 *     await expect(inventoryPage.heading).toBeVisible()
 *   })
 */
import { test as base } from '@playwright/test'
import { InventoryListPage } from './pages/InventoryListPage'
import { ItemDetailPage } from './pages/ItemDetailPage'
import { CreateItemPage } from './pages/CreateItemPage'
import { EditItemPage } from './pages/EditItemPage'

/** The extra fixtures injected by this module. */
type PageFixtures = {
  /** Page object for /items */
  inventoryPage: InventoryListPage
  /** Page object for /items/:id */
  detailPage: ItemDetailPage
  /** Page object for /items/new */
  createPage: CreateItemPage
  /** Page object for /items/:id/edit */
  editPage: EditItemPage
}

export const test = base.extend<PageFixtures>({
  inventoryPage: async ({ page }, use) => {
    await use(new InventoryListPage(page))
  },
  detailPage: async ({ page }, use) => {
    await use(new ItemDetailPage(page))
  },
  createPage: async ({ page }, use) => {
    await use(new CreateItemPage(page))
  },
  editPage: async ({ page }, use) => {
    await use(new EditItemPage(page))
  },
})

// Re-export expect so specs only need a single import source.
export { expect } from '@playwright/test'
