import { type Page, type Locator } from '@playwright/test'

/**
 * Models the Discogs Marketplace panel that lives at the bottom of the
 * detail page. Keeping it as a nested object makes the sync-specific
 * assertions readable: `detailPage.discogs.syncButton`.
 */
export class DiscogsSyncPanel {
  /** "Not synced" status label (initial state). */
  readonly notSynced: Locator
  /** "Listed on Discogs" success badge. */
  readonly listedOnDiscogs: Locator
  /** "Sync error" error badge. */
  readonly syncError: Locator
  /**
   * The primary action button. Matches "Sync to Discogs" and "Re-sync"
   * (shown after a successful listing).
   */
  readonly syncButton: Locator
  /** The same button while the async call is in-flight ("Syncing…"). */
  readonly syncingButton: Locator

  constructor(readonly page: Page) {
    const panel = page.getByTestId('discogs-panel')
    this.notSynced = panel.getByText('Not synced')
    this.listedOnDiscogs = panel.getByText('Listed on Discogs')
    this.syncError = panel.getByText('Sync error')
    this.syncButton = page.getByRole('button', { name: /sync to discogs|re-sync/i })
    this.syncingButton = page.getByRole('button', { name: /syncing/i })
  }

  /**
   * A combined locator that matches either terminal state.
   * Useful for asserting that a sync attempt completed without caring whether
   * it succeeded or failed.
   */
  terminalStatus(): Locator {
    return this.listedOnDiscogs.or(this.syncError)
  }

  /** Click the sync / re-sync button. */
  async clickSync() {
    await this.syncButton.click()
  }
}

/**
 * Page object for /items/:id.
 *
 * The Discogs panel is exposed as `discogs` so callers can write
 * `detailPage.discogs.syncButton` instead of looking up the locator inline.
 */
export class ItemDetailPage {
  /** "Edit" button that opens the edit form. */
  readonly editButton: Locator
  /** Discogs Marketplace panel — sync status and actions. */
  readonly discogs: DiscogsSyncPanel

  constructor(readonly page: Page) {
    this.editButton = page.getByRole('button', { name: 'Edit' })
    this.discogs = new DiscogsSyncPanel(page)
  }

  /** Navigate to the detail page for `id`. */
  async goto(id: string) {
    await this.page.goto(`/items/${id}`)
  }

  /** The item title rendered as an h1. */
  heading(title: string): Locator {
    return this.page.getByRole('heading', { name: title })
  }

  /**
   * A locator for any piece of visible text (price, condition, comments, etc.).
   * Keeps the test code DRY: `detailPage.field('$24.99')`.
   */
  field(text: string): Locator {
    return this.page.getByText(text)
  }

  /** The "Item not found" error message shown for unknown IDs. */
  notFoundError(): Locator {
    return this.page.getByText('Item not found')
  }

  /** Click "Edit" to navigate to the edit form. */
  async clickEdit() {
    await this.editButton.click()
  }

  /** Click "← Back to inventory" to return to the list. */
  async clickBackToInventory() {
    await this.page.getByText('← Back to inventory').click()
  }
}
