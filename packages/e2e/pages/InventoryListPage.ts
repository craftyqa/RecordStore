import { type Page, type Locator } from '@playwright/test'

/**
 * Page object for the /items inventory list page.
 *
 * Exposes locators for every stable UI element and action methods that wrap
 * common multi-step interactions (e.g. checking a row, applying a bulk price).
 */
export class InventoryListPage {
  /** "Inventory" h1 heading */
  readonly heading: Locator
  /** "+ Add Item" navigation button */
  readonly addItemButton: Locator
  /** Pagination "Previous" button */
  readonly previousButton: Locator
  /** Pagination "Next" button */
  readonly nextButton: Locator
  /** Select-all checkbox in the table header row */
  readonly headerCheckbox: Locator
  /** Price input inside the bulk-price toolbar */
  readonly bulkPriceInput: Locator
  /** "Apply" button inside the bulk-price toolbar */
  readonly applyButton: Locator
  /** Validation error shown when the bulk price is invalid */
  readonly bulkPriceError: Locator

  constructor(readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Inventory' })
    this.addItemButton = page.getByRole('button', { name: '+ Add Item' })
    this.previousButton = page.getByRole('button', { name: 'Previous' })
    this.nextButton = page.getByRole('button', { name: 'Next' })
    this.headerCheckbox = page.getByRole('columnheader').getByRole('checkbox')
    this.bulkPriceInput = page.getByPlaceholder('0.00')
    this.applyButton = page.getByRole('button', { name: 'Apply' })
    this.bulkPriceError = page.getByText('Enter a valid price')
  }

  /** Navigate to the inventory list. */
  async goto() {
    await this.page.goto('/items')
  }

  /** A specific column header cell. */
  columnHeader(name: string): Locator {
    return this.page.getByRole('columnheader', { name })
  }

  /**
   * The first table row whose text includes `title`.
   * Using `.first()` guards against strict-mode violations when prior test
   * runs left duplicate-titled rows in the DB.
   */
  row(title: string): Locator {
    return this.page.getByRole('row').filter({ hasText: title }).first()
  }

  /**
   * The title cell that navigates to the detail page when clicked.
   * Also uses `.first()` for the same reason as `row()`.
   */
  titleCell(title: string): Locator {
    return this.page.getByRole('cell', { name: title }).first()
  }

  /** The row-level selection checkbox for a given item title. */
  rowCheckbox(title: string): Locator {
    return this.row(title).getByRole('checkbox')
  }

  /** A price cell inside a specific row, matched by the formatted string (e.g. "$29.99"). */
  rowPrice(title: string, formattedPrice: string): Locator {
    return this.row(title).getByText(formattedPrice)
  }

  /** "N selected" label that appears inside the bulk-price toolbar. */
  selectionCount(n: number): Locator {
    return this.page.getByText(`${n} selected`)
  }

  /** Any "N selected" label — useful when the exact count is unknown. */
  anySelectionCount(): Locator {
    return this.page.getByText(/\d+ selected/)
  }

  /** "Page 1" pagination indicator. */
  pageIndicator(): Locator {
    return this.page.getByText('Page 1')
  }

  /** Wait until the title cell for `title` is present in the DOM. */
  async waitForItem(title: string) {
    await this.titleCell(title).waitFor()
  }

  /** Click the title cell to navigate to the detail page. */
  async clickItem(title: string) {
    await this.titleCell(title).click()
  }

  /** Check the row-level checkbox for an item. */
  async selectRow(title: string) {
    await this.row(title).getByRole('checkbox').check()
  }

  /** Uncheck the row-level checkbox for an item. */
  async deselectRow(title: string) {
    await this.row(title).getByRole('checkbox').uncheck()
  }

  /** Check the header "select all" checkbox. */
  async selectAll() {
    await this.headerCheckbox.check()
  }

  /** Fill the bulk-price input and click Apply. */
  async applyBulkPrice(price: string) {
    await this.bulkPriceInput.fill(price)
    await this.applyButton.click()
  }

  /** Click "+ Add Item" to navigate to the create form. */
  async clickAddItem() {
    await this.addItemButton.click()
  }
}
