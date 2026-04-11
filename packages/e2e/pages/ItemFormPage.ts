import { type Page, type Locator } from '@playwright/test'

/** Fields accepted by the shared item form (all optional so callers can fill a subset). */
export interface FormValues {
  title?: string
  price?: string | number
  quantity?: string | number
  media_condition?: string
  sleeve_condition?: string
  discogs_id?: string
  comments?: string
}

/**
 * Encapsulates the shared ItemForm component rendered on both the Create and
 * Edit pages. Holds locators for every field and the two possible validation
 * error messages, and exposes a single `fill()` helper that populates
 * whichever fields are provided.
 */
export class ItemFormPage {
  readonly titleInput: Locator
  readonly priceInput: Locator
  readonly quantityInput: Locator
  readonly mediaConditionSelect: Locator
  readonly sleeveConditionSelect: Locator
  readonly discogsIdInput: Locator
  readonly commentsInput: Locator
  /** Shown when the title field is submitted blank. */
  readonly titleError: Locator
  /** Shown when the price field is zero or negative. */
  readonly priceError: Locator

  constructor(readonly page: Page) {
    this.titleInput = page.getByLabel('Title *')
    this.priceInput = page.getByLabel('Price *')
    this.quantityInput = page.getByLabel('Quantity')
    this.mediaConditionSelect = page.getByLabel('Media Condition')
    this.sleeveConditionSelect = page.getByLabel('Sleeve Condition')
    this.discogsIdInput = page.getByLabel('Discogs ID')
    this.commentsInput = page.getByLabel('Comments')
    this.titleError = page.getByText('Title is required')
    this.priceError = page.getByText('Price must be positive')
  }

  /** Fill any subset of form fields. Skips fields not included in `values`. */
  async fill(values: FormValues) {
    if (values.title !== undefined) await this.titleInput.fill(values.title)
    if (values.price !== undefined) await this.priceInput.fill(String(values.price))
    if (values.quantity !== undefined) await this.quantityInput.fill(String(values.quantity))
    if (values.media_condition !== undefined)
      await this.mediaConditionSelect.selectOption(values.media_condition)
    if (values.sleeve_condition !== undefined)
      await this.sleeveConditionSelect.selectOption(values.sleeve_condition)
    if (values.discogs_id !== undefined) await this.discogsIdInput.fill(values.discogs_id)
    if (values.comments !== undefined) await this.commentsInput.fill(values.comments)
  }
}
