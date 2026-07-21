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
      {title && (
        <h2 className="mb-3.5 border-b-2 border-slate-200 pb-2 text-base font-semibold text-navy">{title}</h2>
      )}
      {children}
    </div>
  )
}
