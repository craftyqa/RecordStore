import { type Page, type Locator } from '@playwright/test'
import { ItemFormPage, type FormValues } from './ItemFormPage'

/**
 * Page object for /items/:id/edit.
 *
 * Composes `ItemFormPage` for field access and validation errors, and adds
 * the edit-specific heading, back link, submit button, and conflict error.
 */
export class EditItemPage {
  /** Shared form fields and validation error locators. */
  readonly form: ItemFormPage
  /** "Edit Item" h1 heading. */
  readonly heading: Locator
  /** "Save Changes" submit button. */
  readonly submitButton: Locator
  /**
   * The 409 version-conflict banner: "This item was modified by someone
   * else. Reload the page to get the latest version."
   */
  readonly conflictError: Locator

  constructor(readonly page: Page) {
    this.form = new ItemFormPage(page)
    this.heading = page.getByRole('heading', { name: 'Edit Item' })
    this.submitButton = page.getByRole('button', { name: 'Save Changes' })
    this.conflictError = page.getByText(
      'This item was modified by someone else',
      { exact: false },
    )
  }

  /** Navigate to the edit form for `id`. */
  async goto(id: string) {
    await this.page.goto(`/items/${id}/edit`)
  }

  /** Click "← Back to item" to return to the detail page without saving. */
  async clickBackToItem() {
    await this.page.getByText('← Back to item').click()
  }

  /** Fill any subset of form fields. */
  async fill(values: FormValues) {
    await this.form.fill(values)
  }

  /** Click the "Save Changes" submit button. */
  async submit() {
    await this.submitButton.click()
  }

  /** Convenience: fill fields then click submit in one call. */
  async fillAndSubmit(values: FormValues) {
    await this.fill(values)
    await this.submit()
  }
}
