import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ConditionBadge } from './ConditionBadge'

describe('ConditionBadge', () => {
  it('renders "—" for a null value', () => {
    render(<ConditionBadge value={null} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('renders the condition label', () => {
    render(<ConditionBadge value="Near Mint (NM or M-)" />)
    expect(screen.getByText('Near Mint (NM or M-)')).toBeInTheDocument()
  })

  it('applies fallback styling for an unrecognised condition', () => {
    const { container } = render(<ConditionBadge value="Excellent" />)
    expect(container.querySelector('span')!.className).toContain('bg-secondary')
  })

  it.each([
    ['Mint (M)', 'bg-purple-100', 'text-purple-800'],
    ['Near Mint (NM or M-)', 'bg-green-100', 'text-green-800'],
    ['Very Good Plus (VG+)', 'bg-blue-100', 'text-blue-800'],
    ['Very Good (VG)', 'bg-yellow-100', 'text-yellow-800'],
    ['Good Plus (G+)', 'bg-orange-100', 'text-orange-800'],
    ['Good (G)', 'bg-red-100', 'text-red-800'],
    ['Fair (F)', 'bg-red-200', 'text-red-900'],
    ['Poor (P)', 'bg-gray-100', 'text-gray-600'],
  ])('%s → %s %s', (condition, bg, text) => {
    const { container } = render(<ConditionBadge value={condition} />)
    const badge = container.querySelector('span')!
    expect(badge.className).toContain(bg)
    expect(badge.className).toContain(text)
  })
})
