import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

type Color = 'red' | 'amber' | 'blue' | 'green' | 'purple' | 'grey'

const colorClasses: Record<Color, string> = {
  red: 'bg-red-500/15 text-red-400',
  amber: 'bg-amber-500/15 text-amber-400',
  blue: 'bg-blue-500/15 text-blue-400',
  green: 'bg-green-500/15 text-green-400',
  purple: 'bg-purple-500/15 text-purple-400',
  grey: 'bg-white/10 text-white/60',
}

export function Badge({ color, children }: { color: Color; children: ReactNode }) {
  return (
    <span className={cn('inline-block rounded-full px-2.5 py-0.5 text-xs font-medium', colorClasses[color])}>
      {children}
    </span>
  )
}
