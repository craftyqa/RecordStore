import { cn } from '@/lib/utils'

const conditionStyles: Record<string, string> = {
  M: 'bg-purple-100 text-purple-800',
  NM: 'bg-green-100 text-green-800',
  'VG+': 'bg-blue-100 text-blue-800',
  VG: 'bg-yellow-100 text-yellow-800',
  'G+': 'bg-orange-100 text-orange-800',
  G: 'bg-red-100 text-red-800',
  F: 'bg-red-200 text-red-900',
  P: 'bg-gray-100 text-gray-600',
}

interface ConditionBadgeProps {
  value: string | null
}

export function ConditionBadge({ value }: ConditionBadgeProps) {
  if (!value) return <span className="text-muted-foreground">—</span>
  const style = conditionStyles[value] ?? 'bg-secondary text-secondary-foreground'
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold', style)}>
      {value}
    </span>
  )
}
