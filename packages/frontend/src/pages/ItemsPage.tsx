import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '@/lib/api'
import { ConditionBadge } from '@/components/ConditionBadge'
import type { Item } from '@/types/item'

const LIMIT = 20

export function ItemsPage() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkPrice, setBulkPrice] = useState('')
  const [bulkError, setBulkError] = useState<string | null>(null)
  const [bulkSaving, setBulkSaving] = useState(false)

  const [searchParams, setSearchParams] = useSearchParams()
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const navigate = useNavigate()
  const bulkInputRef = useRef<HTMLInputElement>(null)

  function loadItems() {
    setLoading(true)
    setError(null)
    api.items
      .list(page, LIMIT)
      .then(({ data }) => {
        setItems(data)
        setHasMore(data.length === LIMIT)
        setSelectedIds(new Set())
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadItems()
  }, [page]) // eslint-disable-line react-hooks/exhaustive-deps

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    setSelectedIds(selectedIds.size === items.length ? new Set() : new Set(items.map((i) => i.id)))
  }

  async function handleBulkPrice() {
    const price = parseFloat(bulkPrice)
    if (isNaN(price) || price <= 0) {
      setBulkError('Enter a valid price')
      bulkInputRef.current?.focus()
      return
    }
    setBulkError(null)
    setBulkSaving(true)
    try {
      await api.items.bulkUpdatePrice(Array.from(selectedIds), price)
      setBulkPrice('')
      loadItems()
    } catch (err) {
      setBulkError(err instanceof Error ? err.message : 'Failed to update prices')
    } finally {
      setBulkSaving(false)
    }
  }

  const allSelected = items.length > 0 && selectedIds.size === items.length

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Inventory</h1>
        <button
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          onClick={() => navigate('/items/new')}
        >
          + Add Item
        </button>
      </div>

      {selectedIds.size > 0 && (
        <div className="mb-4 flex items-center gap-3 rounded-md border border-border bg-muted/50 px-4 py-2 text-sm">
          <span className="text-muted-foreground">{selectedIds.size} selected</span>
          <span className="text-border">|</span>
          <span className="text-foreground font-medium">Update price:</span>
          <input
            ref={bulkInputRef}
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={bulkPrice}
            onChange={(e) => setBulkPrice(e.target.value)}
            className="w-24 rounded border border-border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            onClick={handleBulkPrice}
            disabled={bulkSaving}
            className="rounded bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {bulkSaving ? 'Saving...' : 'Apply'}
          </button>
          {bulkError && <span className="text-destructive text-xs">{bulkError}</span>}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="rounded-md border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <th className="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  className="rounded border-border"
                />
              </th>
              <th className="px-4 py-3 text-left font-medium">Title</th>
              <th className="px-4 py-3 text-left font-medium">Media</th>
              <th className="px-4 py-3 text-left font-medium">Sleeve</th>
              <th className="px-4 py-3 text-right font-medium">Price</th>
              <th className="px-4 py-3 text-right font-medium">Qty</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  Loading...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No items found.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr
                  key={item.id}
                  className="bg-background hover:bg-muted/50 transition-colors"
                >
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(item.id)}
                      onChange={() => toggleSelect(item.id)}
                      className="rounded border-border"
                    />
                  </td>
                  <td
                    className="px-4 py-3 font-medium text-foreground cursor-pointer"
                    onClick={() => navigate(`/items/${item.id}`)}
                  >
                    {item.title}
                  </td>
                  <td className="px-4 py-3">
                    <ConditionBadge value={item.media_condition} />
                  </td>
                  <td className="px-4 py-3">
                    <ConditionBadge value={item.sleeve_condition} />
                  </td>
                  <td className="px-4 py-3 text-right text-foreground">
                    ${parseFloat(item.price).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right text-foreground">{item.quantity}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
        <button
          className="px-3 py-1 rounded border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
          disabled={page === 1}
          onClick={() => setSearchParams({ page: String(page - 1) })}
        >
          Previous
        </button>
        <span>Page {page}</span>
        <button
          className="px-3 py-1 rounded border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
          disabled={!hasMore}
          onClick={() => setSearchParams({ page: String(page + 1) })}
        >
          Next
        </button>
      </div>
    </div>
  )
}
