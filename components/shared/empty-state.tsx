import { Inbox } from 'lucide-react'

interface EmptyStateProps {
  title: string
  description?: string
  children?: React.ReactNode
}

export function EmptyState({ title, description, children }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Inbox className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && <p className="text-muted-foreground mt-1 max-w-md">{description}</p>}
      {children && <div className="mt-4">{children}</div>}
    </div>
  )
}
