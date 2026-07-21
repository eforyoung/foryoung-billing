import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface CardProps {
  title?: string
  children: ReactNode
  className?: string
}

export function Card({ title, children, className }: CardProps) {
  return (
    <div className={cn('rounded-lg border border-slate-200 bg-white p-5 shadow-sm', className)}>
      {title && <h2 className="mb-4 text-base font-semibold text-slate-900">{title}</h2>}
      {children}
    </div>
  )
}
