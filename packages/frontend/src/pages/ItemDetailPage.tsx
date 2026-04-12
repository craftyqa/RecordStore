import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '@/lib/api'
import { ConditionBadge } from '@/components/ConditionBadge'
import type { Item } from '@/types/item'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</dt>
      <dd className="mt-1 text-sm text-foreground">{children}</dd>
    </div>
  )
}

function DiscogsStatus({ item, onSync }: { item: Item; onSync: () => void }) {
  const [syncing, setSyncing] = useState(false)

  async function handleSync() {
    setSyncing(true)
    try {
      await api.items.syncToDiscogs(item.id)
    } catch {
      // error state is persisted on the item and shown via onSync refresh
    } finally {
      setSyncing(false)
      onSync()
    }
  }

  const statusBadge = {
    never: <span className="text-xs text-muted-foreground">Not synced</span>,
    listed: (
      <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">
        Listed on Discogs
      </span>
    ),
    error: (
      <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">
        Sync error
      </span>
    ),
  }[item.discogs_sync_status]

  return (
    <div className="mt-6 rounded-md border border-border p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-foreground mb-1">Discogs Marketplace</p>
          <div className="flex items-center gap-2">
            {statusBadge}
            {item.discogs_synced_at && (
              <span className="text-xs text-muted-foreground">
                Last synced {new Date(item.discogs_synced_at).toLocaleString()}
              </span>
            )}
          </div>
          {item.discogs_sync_status === 'error' && item.discogs_sync_error && (
            <p className="mt-1 text-xs text-destructive">{item.discogs_sync_error}</p>
          )}
        </div>
        <button
          onClick={handleSync}
          disabled={syncing || !item.discogs_id || item.quantity < 1}
          title={!item.discogs_id ? 'Set a Discogs release ID before syncing' : item.quantity < 1 ? 'Item must have quantity of at least 1 to sync' : undefined}
          className={`rounded-md px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed ${
            item.discogs_sync_status === 'listed'
              ? 'bg-green-600 text-white'
              : 'bg-primary text-primary-foreground'
          }`}
        >
          {syncing ? 'Syncing...' : item.discogs_sync_status === 'listed' ? 'Synced to Discogs' : 'Sync to Discogs'}
        </button>
      </div>
    </div>
  )
}

export function ItemDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [item, setItem] = useState<Item | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  function loadItem() {
    if (!id) return
    api.items
      .get(id)
      .then(({ data }) => setItem(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadItem()
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return <div className="p-8 text-muted-foreground">Loading...</div>
  }

  if (error || !item) {
    return (
      <div className="p-8">
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error ?? 'Item not found'}
        </div>
        <button
          className="mt-4 text-sm text-muted-foreground hover:text-foreground"
          onClick={() => navigate('/items')}
        >
          ← Back to inventory
        </button>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-2xl">
      <button
        className="mb-6 text-sm text-muted-foreground hover:text-foreground"
        onClick={() => navigate('/items')}
      >
        ← Back to inventory
      </button>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">{item.title}</h1>
        <button
          className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
          onClick={() => navigate(`/items/${id}/edit`)}
        >
          Edit
        </button>
      </div>

      <div className="rounded-md border border-border p-6">
        <dl className="grid grid-cols-2 gap-6">
          <Field label="Price">${parseFloat(item.price).toFixed(2)}</Field>
          <Field label="Quantity">{item.quantity}</Field>
          <Field label="Media Condition">
            <ConditionBadge value={item.media_condition} />
          </Field>
          <Field label="Sleeve Condition">
            <ConditionBadge value={item.sleeve_condition} />
          </Field>
          {item.discogs_id && (
            <Field label="Discogs Release ID">{item.discogs_id}</Field>
          )}
          {item.discogs_listing_id && (
            <Field label="Discogs Listing ID">{item.discogs_listing_id}</Field>
          )}
          {item.comments && (
            <div className="col-span-2">
              <Field label="Comments">{item.comments}</Field>
            </div>
          )}
          <Field label="Added">{new Date(item.created_at).toLocaleDateString()}</Field>
          <Field label="Updated">{new Date(item.updated_at).toLocaleDateString()}</Field>
        </dl>
      </div>

      <DiscogsStatus item={item} onSync={loadItem} />
    </div>
  )
}
