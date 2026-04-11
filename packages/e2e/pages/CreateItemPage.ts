import { type Page, type Locator } from '@playwright/test'
import { ItemFormPage, type FormValues } from './ItemFormPage'

/**
 * Page object for /items/new.
 *
 * Composes `ItemFormPage` for field access and validation errors, and adds
 * the page-level heading, back link, and submit button.
 */
export class CreateItemPage {
  /** Shared form fields and validation error locators. */
  readonly form: ItemFormPage
  /** "Add Item" h1 heading. */
  readonly heading: Locator
  /** "Add Item" submit button. */
  readonly submitButton: Locator

  constructor(readonly page: Page) {
    this.form = new ItemFormPage(page)
    this.heading = page.getByRole('heading', { name: 'Add Item' })
    this.submitButton = page.getByRole('button', { name: 'Add Item' })
  }

  /** Navigate to the create form. */
  async goto() {
    await this.page.goto('/items/new')
  }

  /** Click "← Back to inventory" without submitting. */
  async clickBackToInventory() {
    await this.page.getByText('← Back to inventory').click()
  }

  /** Fill any subset of form fields. */
  async fill(values: FormValues) {
    await this.form.fill(values)
  }

  /** Click the "Add Item" submit button. */
  async submit() {
    await this.submitButton.click()
  }

  /** Convenience: fill fields then click submit in one call. */
  async fillAndSubmit(values: FormValues) {
    await this.fill(values)
    await this.submit()
  }
}
