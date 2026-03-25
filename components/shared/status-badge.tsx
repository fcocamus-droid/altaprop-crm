import { cn } from '@/lib/utils'
import { PROPERTY_STATUSES, APPLICATION_STATUSES } from '@/lib/constants'

interface StatusBadgeProps {
  status: string
  type: 'property' | 'application'
}

export function StatusBadge({ status, type }: StatusBadgeProps) {
  const statuses = type === 'property' ? PROPERTY_STATUSES : APPLICATION_STATUSES
  const found = statuses.find(s => s.value === status)

  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', found?.color || 'bg-gray-100 text-gray-800')}>
      {found?.label || status}
    </span>
  )
}
