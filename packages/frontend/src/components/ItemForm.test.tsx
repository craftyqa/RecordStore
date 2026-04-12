import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ItemForm } from './ItemForm'

function renderForm(onSubmit = vi.fn().mockResolvedValue(undefined), label = 'Save') {
  return render(<ItemForm onSubmit={onSubmit} submitLabel={label} />)
}

describe('ItemForm — rendering', () => {
  it('renders all form fields', () => {
    renderForm()
    expect(screen.getByLabelText(/title \*/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/price \*/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/quantity/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/media condition/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/sleeve condition/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/discogs id/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/comments/i)).toBeInTheDocument()
  })

  it('uses the submitLabel prop for the submit button', () => {
    renderForm(vi.fn(), 'Create Record')
    expect(screen.getByRole('button', { name: 'Create Record' })).toBeInTheDocument()
  })

  it('pre-fills fields from defaultValues', () => {
    render(
      <ItemForm
        onSubmit={vi.fn()}
        submitLabel="Save"
        defaultValues={{ title: 'Kind of Blue', price: 24.99 }}
      />,
    )
    expect(screen.getByLabelText(/title \*/i)).toHaveValue('Kind of Blue')
    expect(screen.getByLabelText(/price \*/i)).toHaveValue(24.99)
  })
})

describe('ItemForm — validation', () => {
  it('shows "Title is required" when submitted with an empty title', async () => {
    const user = userEvent.setup()
    renderForm()
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await screen.findByText('Title is required')
  })

  it('shows "Price must be positive" when price is zero', async () => {
    const user = userEvent.setup()
    renderForm()
    await user.type(screen.getByLabelText(/title \*/i), 'Test')
    await user.clear(screen.getByLabelText(/price \*/i))
    await user.type(screen.getByLabelText(/price \*/i), '0')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await screen.findByText('Price must be positive')
  })

  it('does not call onSubmit when validation fails', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    render(<ItemForm onSubmit={onSubmit} submitLabel="Save" />)
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await screen.findByText('Title is required')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('calls onSubmit with parsed values when the form is valid', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(<ItemForm onSubmit={onSubmit} submitLabel="Save" />)
    await user.type(screen.getByLabelText(/title \*/i), 'Kind of Blue')
    await user.clear(screen.getByLabelText(/price \*/i))
    await user.type(screen.getByLabelText(/price \*/i), '24.99')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledOnce())
    const [values] = onSubmit.mock.calls[0]
    expect(values).toMatchObject({ title: 'Kind of Blue', price: 24.99 })
  })
})
