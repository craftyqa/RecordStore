import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { cn } from '@/lib/utils'
import { itemFormSchema, type ItemFormValues } from '@/lib/itemSchema'
import { api } from '@/lib/api'

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

interface ItemFormProps {
  defaultValues?: Partial<ItemFormValues>
  onSubmit: (values: ItemFormValues) => Promise<void>
  submitLabel: string
  showSyncOptions?: boolean
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

export function ItemForm({ defaultValues, onSubmit, submitLabel, showSyncOptions }: ItemFormProps) {
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ItemFormValues>({
    resolver: zodResolver(itemFormSchema),
    defaultValues: { quantity: 0, ...defaultValues },
  })

  const discogsId = useWatch({ control, name: 'discogs_id' })
  const quantity = useWatch({ control, name: 'quantity' })

  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPreviewUrl(URL.createObjectURL(file))
    setUploadError(null)
    setUploading(true)
    try {
      const { path } = await api.items.uploadImage(file)
      setValue('image_path', path)
    } catch {
      setUploadError('Image upload failed. The item can still be saved without an image.')
      setPreviewUrl(null)
    } finally {
      setUploading(false)
    }
  }

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

      <div>
        <Label htmlFor="image">Image</Label>
        <input
          id="image"
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          className="w-full text-sm text-foreground file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-medium file:cursor-pointer hover:file:bg-muted/80"
        />
        {uploading && <p className="mt-1 text-xs text-muted-foreground">Uploading...</p>}
        {uploadError && <p className="mt-1 text-xs text-destructive">{uploadError}</p>}
        {previewUrl && !uploading && (
          <img
            src={previewUrl}
            alt="Preview"
            className="mt-2 h-32 w-32 rounded-md object-cover border border-border"
          />
        )}
      </div>

      {showSyncOptions && (
        <div className="rounded-md border border-border p-4 space-y-3">
          <p className="text-sm font-medium text-foreground">After saving</p>
          <label className={cn('flex items-center gap-2 text-sm cursor-pointer', !discogsId && 'opacity-50 cursor-not-allowed')}>
            <input
              type="checkbox"
              {...register('syncToDiscogs')}
              disabled={!discogsId}
              className="rounded border-border"
            />
            <span>List on Discogs</span>
            {!discogsId && <span className="text-xs text-muted-foreground">(requires Discogs ID)</span>}
          </label>
          <label className={cn('flex items-center gap-2 text-sm cursor-pointer', Number(quantity) < 1 && 'opacity-50 cursor-not-allowed')}>
            <input
              type="checkbox"
              {...register('syncToShopify')}
              disabled={Number(quantity) < 1}
              className="rounded border-border"
            />
            <span>List on Shopify</span>
            {Number(quantity) < 1 && <span className="text-xs text-muted-foreground">(requires quantity ≥ 1)</span>}
          </label>
        </div>
      )}

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
