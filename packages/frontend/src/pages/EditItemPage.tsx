import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '@/lib/api'
import { ItemForm } from '@/components/ItemForm'
import { type ItemFormValues } from '@/lib/itemSchema'
import type { Item } from '@/types/item'

export function EditItemPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [item, setItem] = useState<Item | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    api.items
      .get(id)
      .then(({ data }) => setItem(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  async function handleSubmit(values: ItemFormValues) {
    setSubmitError(null)
    try {
      await api.items.update(id!, { ...values, version: item!.version })
      navigate(`/items/${id}`)
    } catch (err) {
      const e = err as { status?: number; message?: string }
      if (e.status === 409) {
        setSubmitError('This item was modified by someone else. Reload the page to get the latest version.')
      } else {
        setSubmitError(e.message ?? 'Failed to save changes')
      }
    }
  }

  if (loading) return <div className="p-8 text-muted-foreground">Loading...</div>

  if (error || !item) {
    return (
      <div className="p-8">
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error ?? 'Item not found'}
        </div>
      </div>
    )
  }

  const defaultValues: Partial<ItemFormValues> = {
    title: item.title,
    price: parseFloat(item.price),
    quantity: item.quantity,
    media_condition: item.media_condition ?? '',
    sleeve_condition: item.sleeve_condition ?? '',
    comments: item.comments ?? '',
    discogs_id: item.discogs_id ?? '',
  }

  return (
    <div className="p-8 max-w-2xl">
      <button
        className="mb-6 text-sm text-muted-foreground hover:text-foreground"
        onClick={() => navigate(`/items/${id}`)}
      >
        ← Back to item
      </button>
      <h1 className="text-2xl font-bold text-foreground mb-6">Edit Item</h1>
      {submitError && (
        <div className="mb-4 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {submitError}
        </div>
      )}
      <div className="rounded-md border border-border p-6">
        <ItemForm onSubmit={handleSubmit} submitLabel="Save Changes" defaultValues={defaultValues} />
      </div>
    </div>
  )
}
