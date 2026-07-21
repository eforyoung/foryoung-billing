import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

type Color = 'red' | 'amber' | 'blue' | 'green' | 'purple' | 'grey'

const colorClasses: Record<Color, string> = {
  red: 'bg-red-100 text-red-700',
  amber: 'bg-amber-100 text-amber-800',
  blue: 'bg-blue-100 text-blue-700',
  green: 'bg-green-100 text-green-800',
  purple: 'bg-purple-100 text-purple-700',
  grey: 'bg-slate-100 text-slate-600',
}

export function Badge({ color, children }: { color: Color; children: ReactNode }) {
  return (
    <span className={cn('inline-block rounded-full px-2.5 py-0.5 text-xs font-medium', colorClasses[color])}>
      {children}
    </span>
  )
}
