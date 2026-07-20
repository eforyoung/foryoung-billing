import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface CardProps {
  title?: string
  children: ReactNode
  className?: string
}

export function Card({ title, children, className }: CardProps) {
  return (
    <div className={cn('rounded-lg border border-teal/20 bg-dark-card p-5', className)}>
      {title && <h2 className="mb-4 text-base font-semibold text-white">{title}</h2>}
      {children}
    </div>
  )
}
