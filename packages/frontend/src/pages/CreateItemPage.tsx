import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { ItemForm } from '@/components/ItemForm'
import { type ItemFormValues } from '@/lib/itemSchema'

export function CreateItemPage() {
  const navigate = useNavigate()

  async function handleSubmit(values: ItemFormValues) {
    const { syncToDiscogs, syncToShopify, ...itemData } = values
    const { data } = await api.items.create(itemData)

    const syncs: Promise<unknown>[] = []
    if (syncToDiscogs) syncs.push(api.items.syncToDiscogs(data.id).catch(() => {}))
    if (syncToShopify) syncs.push(api.items.syncToShopify(data.id).catch(() => {}))
    await Promise.all(syncs)

    navigate(`/items/${data.id}`)
  }

  return (
    <div className="p-8 max-w-2xl">
      <button
        className="mb-6 text-sm text-muted-foreground hover:text-foreground"
        onClick={() => navigate('/items')}
      >
        ← Back to inventory
      </button>
      <h1 className="text-2xl font-bold text-foreground mb-6">Add Item</h1>
      <div className="rounded-md border border-border p-6">
        <ItemForm
          onSubmit={handleSubmit}
          submitLabel="Add Item"
          showSyncOptions
          defaultValues={{ syncToDiscogs: true, syncToShopify: true }}
        />
      </div>
    </div>
  )
}
