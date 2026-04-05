import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { cn } from '@/lib/utils'

const CONDITIONS = [
  '',
  'Mint (M)',
  'Near Mint (NM or M-)',
  'Very Good Plus (VG+)',
  'Very Good (VG)',
  'Good Plus (G+)',
  'Good (G)',
  'Fair (F)',
  'Poor (P)',
] as const

export const itemFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  price: z.coerce.number().positive('Price must be positive'),
  quantity: z.coerce.number().int().min(0).default(0),
  media_condition: z.string().optional(),
  sleeve_condition: z.string().optional(),
  comments: z.string().optional(),
  discogs_id: z.string().optional(),
})

export type ItemFormValues = z.infer<typeof itemFormSchema>

interface ItemFormProps {
  defaultValues?: Partial<ItemFormValues>
  onSubmit: (values: ItemFormValues) => Promise<void>
  submitLabel: string
}

function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-foreground mb-1">
      {children}
    </label>
  )
}

function inputClass(hasError: boolean) {
  return cn(
    'w-full rounded-md border px-3 py-2 text-sm bg-background text-foreground',
    'focus:outline-none focus:ring-2 focus:ring-ring',
    hasError ? 'border-destructive' : 'border-border',
  )
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="mt-1 text-xs text-destructive">{message}</p>
}

export function ItemForm({ defaultValues, onSubmit, submitLabel }: ItemFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ItemFormValues>({
    resolver: zodResolver(itemFormSchema),
    defaultValues: { quantity: 0, ...defaultValues },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div>
        <Label htmlFor="title">Title *</Label>
        <input id="title" {...register('title')} className={inputClass(!!errors.title)} />
        <FieldError message={errors.title?.message} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="price">Price *</Label>
          <input
            id="price"
            type="number"
            step="0.01"
            min="0"
            {...register('price')}
            className={inputClass(!!errors.price)}
          />
          <FieldError message={errors.price?.message} />
        </div>
        <div>
          <Label htmlFor="quantity">Quantity</Label>
          <input
            id="quantity"
            type="number"
            min="0"
            {...register('quantity')}
            className={inputClass(!!errors.quantity)}
          />
          <FieldError message={errors.quantity?.message} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="media_condition">Media Condition</Label>
          <select id="media_condition" {...register('media_condition')} className={inputClass(false)}>
            {CONDITIONS.map((c) => (
              <option key={c} value={c}>
                {c || '— none —'}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="sleeve_condition">Sleeve Condition</Label>
          <select id="sleeve_condition" {...register('sleeve_condition')} className={inputClass(false)}>
            {CONDITIONS.map((c) => (
              <option key={c} value={c}>
                {c || '— none —'}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <Label htmlFor="discogs_id">Discogs ID</Label>
        <input id="discogs_id" {...register('discogs_id')} className={inputClass(false)} />
      </div>

      <div>
        <Label htmlFor="comments">Comments</Label>
        <textarea
          id="comments"
          rows={3}
          {...register('comments')}
          className={inputClass(false)}
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Saving...' : submitLabel}
      </button>
    </form>
  )
}
