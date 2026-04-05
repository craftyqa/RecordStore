import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { ItemForm, type ItemFormValues } from '@/components/ItemForm'

export function CreateItemPage() {
  const navigate = useNavigate()

  async function handleSubmit(values: ItemFormValues) {
    const { data } = await api.items.create(values)
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
        <ItemForm onSubmit={handleSubmit} submitLabel="Add Item" />
      </div>
    </div>
  )
}
