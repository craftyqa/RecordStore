import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./client')
vi.mock('../items/repository')

import { syncItemToDiscogs } from './sync'
import * as client from './client'
import * as repo from '../items/repository'

const mockClient = vi.mocked(client)
const mockRepo = vi.mocked(repo)

const LISTING_ID = 999
const LISTINGS_URL = 'https://api.discogs.com/marketplace/listings'
const CREATED_RESPONSE = { listing_id: LISTING_ID, resource_url: `${LISTINGS_URL}/${LISTING_ID}` }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeItem(overrides: Record<string, unknown> = {}): any {
  return {
    id: 'item-1',
    title: 'Kind of Blue',
    price: { toString: () => '24.99' },
    quantity: 1,
    version: 1,
    media_condition: 'Very Good Plus (VG+)',
    sleeve_condition: null,
    comments: null,
    discogs_id: 'r388',
    discogs_listing_id: null,
    discogs_sync_status: 'pending',
    discogs_sync_error: null,
    discogs_synced_at: null,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  }
}

beforeEach(() => {
  vi.resetAllMocks()
  mockRepo.getById.mockResolvedValue(makeItem())
  mockRepo.update.mockResolvedValue(makeItem())
  mockClient.createListing.mockResolvedValue(CREATED_RESPONSE)
  mockClient.updateListing.mockResolvedValue(undefined)
})

describe('syncItemToDiscogs — validation', () => {
  it('throws when the item does not exist', async () => {
    mockRepo.getById.mockResolvedValue(null)
    await expect(syncItemToDiscogs('missing-id')).rejects.toThrow('Item not found')
  })

  it('throws when the item has no discogs_id', async () => {
    mockRepo.getById.mockResolvedValue(makeItem({ discogs_id: null }))
    await expect(syncItemToDiscogs('item-1')).rejects.toThrow('Item has no Discogs release ID')
  })

  it('throws when media_condition is null', async () => {
    mockRepo.getById.mockResolvedValue(makeItem({ media_condition: null }))
    await expect(syncItemToDiscogs('item-1')).rejects.toThrow('media_condition is required to sync')
  })

  it('throws when media_condition is not a recognised Discogs condition', async () => {
    mockRepo.getById.mockResolvedValue(makeItem({ media_condition: 'Excellent' }))
    await expect(syncItemToDiscogs('item-1')).rejects.toThrow('Unrecognised media_condition')
  })

  it('throws when sleeve_condition is present but not recognised', async () => {
    mockRepo.getById.mockResolvedValue(makeItem({ sleeve_condition: 'Pretty Good' }))
    await expect(syncItemToDiscogs('item-1')).rejects.toThrow('Unrecognised sleeve_condition')
  })
})

describe('syncItemToDiscogs — payload construction', () => {
  it('strips the "r" prefix when parsing the release ID', async () => {
    await syncItemToDiscogs('item-1') // discogs_id: 'r388'
    expect(mockClient.createListing).toHaveBeenCalledWith(
      expect.objectContaining({ release_id: 388 }),
    )
  })

  it('accepts a numeric-only discogs_id', async () => {
    mockRepo.getById.mockResolvedValue(makeItem({ discogs_id: '388' }))
    await syncItemToDiscogs('item-1')
    expect(mockClient.createListing).toHaveBeenCalledWith(
      expect.objectContaining({ release_id: 388 }),
    )
  })

  it('throws when discogs_id is not a valid number', async () => {
    mockRepo.getById.mockResolvedValue(makeItem({ discogs_id: 'rXYZ' }))
    await expect(syncItemToDiscogs('item-1')).rejects.toThrow('Invalid Discogs release ID')
  })

  it('includes sleeve_condition and comments when present', async () => {
    mockRepo.getById.mockResolvedValue(
      makeItem({ sleeve_condition: 'Very Good (VG)', comments: 'Original pressing' }),
    )
    await syncItemToDiscogs('item-1')
    expect(mockClient.createListing).toHaveBeenCalledWith(
      expect.objectContaining({
        sleeve_condition: 'Very Good (VG)',
        comments: 'Original pressing',
      }),
    )
  })

  it('omits sleeve_condition from the payload when null', async () => {
    await syncItemToDiscogs('item-1') // makeItem() has sleeve_condition: null
    const [calledPayload] = mockClient.createListing.mock.calls[0]
    expect(calledPayload.sleeve_condition).toBeUndefined()
  })
})

describe('syncItemToDiscogs — create vs update', () => {
  it('calls createListing when the item has no existing listing', async () => {
    await syncItemToDiscogs('item-1')
    expect(mockClient.createListing).toHaveBeenCalledOnce()
    expect(mockClient.updateListing).not.toHaveBeenCalled()
  })

  it('saves the listing_id and marks the item as listed after create', async () => {
    await syncItemToDiscogs('item-1')
    expect(mockRepo.update).toHaveBeenCalledWith(
      'item-1',
      expect.objectContaining({
        discogs_listing_id: String(LISTING_ID),
        discogs_sync_status: 'listed',
        discogs_sync_error: null,
      }),
    )
  })

  it('calls updateListing when the item already has a listing', async () => {
    mockRepo.getById.mockResolvedValue(makeItem({ discogs_listing_id: '999' }))
    await syncItemToDiscogs('item-1')
    expect(mockClient.updateListing).toHaveBeenCalledWith('999', expect.any(Object))
    expect(mockClient.createListing).not.toHaveBeenCalled()
  })

  it('marks the item as listed after a successful update', async () => {
    mockRepo.getById.mockResolvedValue(makeItem({ discogs_listing_id: '999' }))
    await syncItemToDiscogs('item-1')
    expect(mockRepo.update).toHaveBeenCalledWith(
      'item-1',
      expect.objectContaining({ discogs_sync_status: 'listed', discogs_sync_error: null }),
    )
  })
})

describe('syncItemToDiscogs — error handling', () => {
  it('saves error state to the DB and rethrows when the client throws', async () => {
    mockClient.createListing.mockRejectedValue(
      Object.assign(new Error('Too Many Requests'), { status: 429 }),
    )
    await expect(syncItemToDiscogs('item-1')).rejects.toThrow('Too Many Requests')
    expect(mockRepo.update).toHaveBeenCalledWith(
      'item-1',
      expect.objectContaining({
        discogs_sync_status: 'error',
        discogs_sync_error: 'Too Many Requests',
      }),
    )
  })

  it('does not call repo.update for success fields when client throws', async () => {
    mockClient.createListing.mockRejectedValue(new Error('Unauthorized'))
    await syncItemToDiscogs('item-1').catch(() => {})
    const [, updateData] = mockRepo.update.mock.calls[0]
    expect(updateData).not.toHaveProperty('discogs_listing_id')
    expect(updateData).not.toHaveProperty('discogs_synced_at')
  })
})
